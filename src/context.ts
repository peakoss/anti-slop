import * as github from "@actions/github";
import * as core from "@actions/core";
import type { PullRequestEvent } from "@octokit/webhooks-types";
import type { Context } from "./types";

export function buildContext(): Context {
    core.info("Building context from payload...");

    const payload = github.context.payload as PullRequestEvent;
    const pr = payload.pull_request;

    core.debug(`Payload:\n${JSON.stringify(payload, null, 2)}`);

    return {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,

        repoUrl: pr.base.repo.html_url,

        number: pr.number,

        title: pr.title,
        body: pr.body ?? "",

        baseBranch: pr.base.ref,
        defaultBranch: pr.base.repo.default_branch,

        headBranch: pr.head.ref,
        headSha: pr.head.sha,

        userLogin: pr.user.login,
        authorAssociation: pr.author_association,

        labels: pr.labels.map((label) => label.name),
        milestone: pr.milestone?.title ?? null,

        isDraft: pr.draft,
        maintainerCanModify: pr.maintainer_can_modify,
        // changedFiles: pr.changed_files,
        // additions: pr.additions,
        // deletions: pr.deletions,
    };
}
