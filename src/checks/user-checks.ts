import * as core from "@actions/core";
import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

export async function runUserChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const hasUserChecks =
        settings.minRepoMergedPrs > 0 ||
        settings.minRepoMergeRatio > 0 ||
        settings.minGlobalMergeRatio > 0 ||
        settings.minAccountAge > 0;

    if (!hasUserChecks) return results;

    const user = context.userLogin;
    const repoFull = `${context.owner}/${context.repo}`;
    const globalScope = settings.globalMergeRatioExcludeOwn ? `-user:${user}` : "";

    const [repoMerged, repoClosed, globalMerged, globalClosed, createdAt] = await Promise.all([
        settings.minRepoMergedPrs > 1 || settings.minRepoMergeRatio > 0
            ? searchPrCount(client, `is:pr is:merged author:${user} repo:${repoFull}`)
            : Promise.resolve(0),
        settings.minRepoMergeRatio > 0
            ? searchPrCount(client, `is:pr is:unmerged is:closed author:${user} repo:${repoFull}`)
            : Promise.resolve(0),
        settings.minGlobalMergeRatio > 0
            ? searchPrCount(client, `is:pr is:merged author:${user} ${globalScope}`.trim())
            : Promise.resolve(0),
        settings.minGlobalMergeRatio > 0
            ? searchPrCount(
                  client,
                  `is:pr is:unmerged is:closed author:${user} ${globalScope}`.trim(),
              )
            : Promise.resolve(0),
        settings.minAccountAge > 0 ? getUserCreatedAt(client, user) : Promise.resolve(""),
    ]);

    if (settings.minRepoMergedPrs > 0) {
        if (settings.minRepoMergedPrs === 1) {
            // CONTRIBUTOR means the user has had at least one PR merged.
            const passed = context.authorAssociation === "CONTRIBUTOR";
            recordCheck(results, {
                name: "min-merged-prs",
                passed,
                message: passed
                    ? `User has author association "${context.authorAssociation}", meets minimum of ${String(settings.minRepoMergedPrs)} merged PR(s)`
                    : `User has author association "${context.authorAssociation}", below minimum of ${String(settings.minRepoMergedPrs)} merged PR(s)`,
            });
        } else {
            const passed = repoMerged >= settings.minRepoMergedPrs;
            recordCheck(results, {
                name: "min-merged-prs",
                passed,
                message: passed
                    ? `User has ${String(repoMerged)} merged PR(s), meets minimum of ${String(settings.minRepoMergedPrs)}`
                    : `User has ${String(repoMerged)} merged PR(s), below minimum of ${String(settings.minRepoMergedPrs)}`,
            });
        }
    }

    if (settings.minRepoMergeRatio > 0) {
        const total = repoMerged + repoClosed;
        const minRatio = settings.minRepoMergeRatio / 100;

        if (total === 0) {
            core.info(
                "[SKIP] repo-merge-ratio — No merged or closed PRs in this repository so this check is not applicable",
            );
        } else {
            const ratio = repoMerged / total;
            const mergedPercent = Math.round(ratio * 100);
            const passed = ratio >= minRatio;
            recordCheck(results, {
                name: "repo-merge-ratio",
                passed,
                message: passed
                    ? `Repo merge ratio is ${String(mergedPercent)}% (${String(repoMerged)}/${String(total)}), meets minimum of ${String(settings.minRepoMergeRatio)}%`
                    : `Repo merge ratio is ${String(mergedPercent)}% (${String(repoMerged)}/${String(total)}), below minimum of ${String(settings.minRepoMergeRatio)}%`,
            });
        }
    }

    if (settings.minGlobalMergeRatio > 0) {
        const total = globalMerged + globalClosed;
        const minRatio = settings.minGlobalMergeRatio / 100;
        const scope = settings.globalMergeRatioExcludeOwn ? " (excluding own repos)" : "";

        if (total === 0) {
            core.info(
                `[SKIP] global-merge-ratio — No merged or closed PRs across GitHub${scope} so this check is not applicable`,
            );
        } else {
            const ratio = globalMerged / total;
            const mergedPercent = Math.round(ratio * 100);
            const passed = ratio >= minRatio;
            recordCheck(results, {
                name: "global-merge-ratio",
                passed,
                message: passed
                    ? `Global merge ratio${scope} is ${String(mergedPercent)}% (${String(globalMerged)}/${String(total)}), meets minimum of ${String(settings.minGlobalMergeRatio)}%`
                    : `Global merge ratio${scope} is ${String(mergedPercent)}% (${String(globalMerged)}/${String(total)}), below minimum of ${String(settings.minGlobalMergeRatio)}%`,
            });
        }
    }

    if (settings.minAccountAge > 0) {
        const diffMs = Date.now() - new Date(createdAt).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const passed = diffDays >= settings.minAccountAge;
        recordCheck(results, {
            name: "account-age",
            passed,
            message: passed
                ? `Account is ${String(diffDays)} day(s) old, meets minimum of ${String(settings.minAccountAge)} days`
                : `Account is ${String(diffDays)} day(s) old, below minimum of ${String(settings.minAccountAge)} days`,
        });
    }

    return results;
}

async function getUserCreatedAt(client: Octokit, username: string): Promise<string> {
    const { data } = await client.rest.users.getByUsername({ username });
    return data.created_at;
}

async function searchPrCount(client: Octokit, query: string): Promise<number> {
    const { data } = await client.rest.search.issuesAndPullRequests({ q: query, per_page: 1 });
    core.debug(`searchPrCount — Query: ${query}, Total count: ${String(data.total_count)}`);
    return data.total_count;
}
