import * as core from "@actions/core";
import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

// Matches: type: description, type(scope): description, type(scope)!: description...
// @TODO: Maybe add a setting to restrict allowed conventional commit types or restrict them by default as for now it accepts any type (\w+).
const CONVENTIONAL_PATTERN = /^(\w+)(?:\([^)]+\))?!?:\s.+/;

// When integrating PRs on GitHub, the PR title can be used as the commit message with the PR number appended in parentheses "(#123)" but the PR title might not follow the conventional commits format.
const TITLE_PATTERN = /\(#\d+\)$/;

export async function runCommitChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    if (
        settings.maxCommitMessageLength === 0 &&
        !settings.requireConventionalCommits &&
        !settings.requireCommitAuthorMatch &&
        settings.blockedCommitAuthors.length === 0
    ) {
        return results;
    }

    let commits = await client.paginate(client.rest.pulls.listCommits, {
        owner: context.owner,
        repo: context.repo,
        pull_number: context.number,
        per_page: 100,
    });

    // Exclude inherited commits from the repos default branch that the base (target) branch of the PR hasn't caught up to yet.
    if (context.baseBranch !== context.defaultBranch) {
        const { data: comparison } = await client.rest.repos.compareCommitsWithBasehead({
            owner: context.owner,
            repo: context.repo,
            basehead: `${context.baseBranch}...${context.defaultBranch}`,
        });
        const inheritedShas = new Set(comparison.commits.map((commit) => commit.sha));
        const excluded = commits.filter((commit) => inheritedShas.has(commit.sha));
        for (const commit of excluded) {
            core.debug(
                `Excluding inherited commit ${commit.sha}: ${commit.commit.message.split("\n")[0] ?? ""}`,
            );
        }
        commits = commits.filter((commit) => !inheritedShas.has(commit.sha));
    }

    if (settings.maxCommitMessageLength > 0) {
        const oversizedCommits = commits.filter(
            (commit) => commit.commit.message.length > settings.maxCommitMessageLength,
        );

        const passed = oversizedCommits.length === 0;
        recordCheck(results, {
            name: "max-commit-message-length",
            passed,
            message: passed
                ? `All commit messages are within the ${String(settings.maxCommitMessageLength)} character limit`
                : `${String(oversizedCommits.length)} commit message(s) exceed the ${String(settings.maxCommitMessageLength)} character limit`,
        });
    }

    if (settings.requireConventionalCommits) {
        const subjects = commits
            .map((commit) => commit.commit.message.split("\n")[0] ?? "")
            .filter((subject) => !subject.startsWith("Merge ") && !TITLE_PATTERN.test(subject));

        const passed = subjects.every((subject) => CONVENTIONAL_PATTERN.test(subject));
        recordCheck(results, {
            name: "conventional-commits",
            passed,
            message: passed
                ? "All commit messages follow conventional commits format"
                : "Not all commit messages follow conventional commits format",
        });
    }

    if (settings.requireCommitAuthorMatch) {
        const prAuthor = context.userLogin.toLowerCase();
        const mismatchedAuthors = new Set(
            commits
                .map((commit) => commit.author?.login ?? "")
                .filter((login) => login !== "" && login.toLowerCase() !== prAuthor),
        );

        recordCheck(results, {
            name: "commit-author-match",
            passed: mismatchedAuthors.size === 0,
            message:
                mismatchedAuthors.size > 0
                    ? `Commit author(s) do not match PR author "${context.userLogin}": ${[...mismatchedAuthors].join(", ")}`
                    : "All commit authors match the PR author",
        });
    }

    if (settings.blockedCommitAuthors.length > 0) {
        const blockedAuthors = settings.blockedCommitAuthors.map((author) => author.toLowerCase());
        const blocked = new Set(
            commits
                .map((commit) => (commit.author?.login ?? "").toLowerCase())
                .filter((login) => blockedAuthors.includes(login)),
        );

        recordCheck(results, {
            name: "blocked-commit-authors",
            passed: blocked.size === 0,
            message:
                blocked.size > 0
                    ? `Found ${String(blocked.size)} blocked commit author(s): "${[...blocked].join('", "')}"`
                    : "No blocked commit authors found",
        });
    }

    return results;
}
