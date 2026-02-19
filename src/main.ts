import * as core from "@actions/core";
import { getSettings } from "./settings.ts";
import { buildContext } from "./context.ts";
import { checkExemptions } from "./exemptions.ts";
import { runBranchChecks } from "./checks/branch-checks.ts";
import { runTitleChecks } from "./checks/title-checks.ts";
import { runDescriptionChecks } from "./checks/description-checks.ts";
import { runTemplateChecks } from "./checks/template-checks.ts";
import { runFileChecks } from "./checks/file-checks.ts";
import { runCommitChecks } from "./checks/commit-checks.ts";
import { runUserChecks } from "./checks/user-checks.ts";
import { runMergeChecks } from "./checks/merge-checks.ts";
import { runQualityChecks } from "./checks/quality-checks.ts";
import { setOutputs, writeJobSummary } from "./report.ts";
import { handleFailure, handleSuccess } from "./actions.ts";
import type { CheckResult } from "./types";
import { createClient } from "./api.ts";

export async function run(): Promise<void> {
    try {
        const isLocal = process.env["GITHUB_ACTIONS"] !== "true";

        const settings = getSettings();

        const context = buildContext();

        const client = createClient(settings.githubToken);

        const exempt = checkExemptions(settings, context);

        if (exempt) {
            setOutputs([], settings);
            await writeJobSummary([], settings);
            return;
        }

        const results: CheckResult[] = [];

        core.startGroup("Branch checks");
        results.push(...runBranchChecks(settings, context));
        core.endGroup();

        core.startGroup("Title checks");
        results.push(...runTitleChecks(settings, context));
        core.endGroup();

        core.startGroup("Description checks");
        results.push(...runDescriptionChecks(settings, context));
        core.endGroup();

        if (client) {
            core.startGroup("PR quality checks");
            results.push(...(await runQualityChecks(settings, context, client)));
            core.endGroup();

            core.startGroup("Template checks");
            results.push(...(await runTemplateChecks(settings, context, client)));
            core.endGroup();

            core.startGroup("File checks");
            results.push(...(await runFileChecks(settings, context, client)));
            core.endGroup();

            core.startGroup("Commit checks");
            results.push(...(await runCommitChecks(settings, context, client)));
            core.endGroup();

            core.startGroup("User checks");
            results.push(...(await runUserChecks(settings, context, client)));
            core.endGroup();

            core.startGroup("Merge checks");
            results.push(...(await runMergeChecks(settings, context, client)));
            core.endGroup();
        } else {
            core.warning("No valid GitHub token — checks requiring the GitHub API were skipped");
        }

        const failed = setOutputs(results, settings);
        await writeJobSummary(results, settings);

        if (!isLocal && client) {
            if (failed) {
                await handleFailure(settings, context, client);
            } else {
                await handleSuccess(settings, context, client);
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("An unexpected error occurred");
        }
    }
}
