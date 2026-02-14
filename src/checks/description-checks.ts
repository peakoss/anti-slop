import * as core from "@actions/core";
import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

/**
 * @see https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls#issues-and-pull-requests
 */
const ISSUE_REF_PATTERNS = [
    /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/gi, // matches full issue URLs
    /(?:[\w.-]+\/[\w.-]+)#(\d+)/g, // matches owner/repo#123
    /GH-(\d+)/gi, // matches GH-123
    /(?:^|[\s(])#(\d+)/gm, // matches #123
];

/**
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository#adding-a-pull-request-template
 */
const PR_TEMPLATE_PATHS = [
    ".github/pull_request_template.md",
    "docs/pull_request_template.md",
    "pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md",
    "docs/PULL_REQUEST_TEMPLATE/pull_request_template.md",
    "PULL_REQUEST_TEMPLATE/pull_request_template.md",
];

export async function runDescriptionChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const body = context.body;

    if (settings.requireDescription) {
        const empty = body.replace(/\s/g, "").length === 0;
        recordCheck(results, {
            name: "description-empty",
            passed: !empty,
            message: empty ? "PR description is empty" : "PR description is present",
        });
    }

    if (settings.maxDescriptionLength > 0) {
        const over = body.length > settings.maxDescriptionLength;
        recordCheck(results, {
            name: "description-max-length",
            passed: !over,
            message: over
                ? `Description is ${String(body.length)} chars, exceeds allowed maximum of ${String(settings.maxDescriptionLength)}`
                : `Description is ${String(body.length)} chars, within allowed maximum of ${String(settings.maxDescriptionLength)}`,
        });
    }

    if (settings.maxEmojiCount > 0) {
        const text = `${context.title} ${body}`;
        const count = text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
        const passed = count <= settings.maxEmojiCount;
        recordCheck(results, {
            name: "emoji-count",
            passed,
            message: passed
                ? `Found ${String(count)} emoji(s), within allowed maximum of ${String(settings.maxEmojiCount)}`
                : `Found ${String(count)} emoji(s), exceeds allowed maximum of ${String(settings.maxEmojiCount)}`,
        });
    }

    if (settings.blockedTerms.length > 0) {
        const found = settings.blockedTerms.filter((term) => body.includes(term));
        recordCheck(results, {
            name: "blocked-terms",
            passed: found.length === 0,
            message:
                found.length > 0
                    ? `Blocked term(s) found: ${found.join(", ")}`
                    : "No blocked terms found",
        });
    }

    const issueNumbers = extractIssueNumbers(body);

    if (settings.requireLinkedIssue) {
        recordCheck(results, {
            name: "linked-issue",
            passed: issueNumbers.length > 0,
            message:
                issueNumbers.length > 0
                    ? `Found ${String(issueNumbers.length)} linked issue(s) in the PR description`
                    : "No linked issues found in the PR description",
        });
    }

    if (settings.blockedIssueNumbers.length > 0) {
        const blockedNumbers = settings.blockedIssueNumbers.map((raw) => parseInt(raw));
        const found = issueNumbers.filter((issueNumber) => blockedNumbers.includes(issueNumber));
        recordCheck(results, {
            name: "blocked-issue-numbers",
            passed: found.length === 0,
            message:
                found.length > 0
                    ? `Found blocked issue number(s) in the PR description: ${found.map((issueNumber) => `#${String(issueNumber)}`).join(", ")}`
                    : "No blocked issue numbers found in the PR description",
        });
    }

    if (settings.requirePrTemplate) {
        const template = await fetchPrTemplate(client, context.owner, context.repo);

        if (template === null) {
            core.info(
                "[SKIP] require-pr-template — No repository PR template found so this check is not applicable",
            );
        } else {
            const templateHeadings = template.match(/^#{1,6}\s+.+$/gm);

            if (!templateHeadings || templateHeadings.length === 0) {
                const identical = body.trim() === template.trim();
                recordCheck(results, {
                    name: "pr-template",
                    passed: !identical,
                    message: identical
                        ? "PR description is identical to the template (not filled in)"
                        : "PR description follows the repository PR template structure",
                });
            } else {
                const missing = templateHeadings.filter((heading) => !body.includes(heading));
                recordCheck(results, {
                    name: "pr-template",
                    passed: missing.length === 0,
                    message:
                        missing.length > 0
                            ? `PR description is missing repository PR template section(s)`
                            : "PR description follows the repository PR template structure",
                });
            }
        }
    }

    return results;
}

function extractIssueNumbers(text: string): number[] {
    const numbers = new Set<number>();
    for (const pattern of ISSUE_REF_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
            const num = match[1];
            if (num !== undefined) numbers.add(parseInt(num));
        }
    }
    return [...numbers];
}

async function fetchPrTemplate(
    client: Octokit,
    owner: string,
    repo: string,
): Promise<string | null> {
    for (const path of PR_TEMPLATE_PATHS) {
        try {
            const { data } = await client.rest.repos.getContent({ owner, repo, path, ref: "HEAD" });
            if ("content" in data && typeof data.content === "string") {
                return Buffer.from(data.content, "base64").toString("utf-8");
            }
        } catch {
            continue;
        }
    }
    return null;
}
