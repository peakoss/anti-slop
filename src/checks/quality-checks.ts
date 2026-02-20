import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

export async function runQualityChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    if (settings.requireMaintainerCanModify) {
        const passed = context.maintainerCanModify;
        recordCheck(results, {
            name: "require-maintainer-can-modify",
            passed,
            message: passed
                ? "PR allows maintainers to push to the source branch"
                : "PR does not allow maintainers to push to the source branch",
        });
    }

    if (settings.maxNegativeReactions > 0) {
        const { data } = await client.rest.issues.get({
            owner: context.owner,
            repo: context.repo,
            issue_number: context.number,
        });

        const reactions = data.reactions;
        const negativeCount = (reactions?.["-1"] ?? 0) + (reactions?.confused ?? 0);
        const passed = negativeCount <= settings.maxNegativeReactions;
        recordCheck(results, {
            name: "max-negative-reactions",
            passed,
            message: passed
                ? `PR has ${String(negativeCount)} negative reaction(s), within maximum of ${String(settings.maxNegativeReactions)}`
                : `PR has ${String(negativeCount)} negative reaction(s), exceeds maximum of ${String(settings.maxNegativeReactions)}`,
        });
    }

    return results;
}
