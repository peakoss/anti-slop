import * as core from "@actions/core";
import type { Settings, Context, Octokit } from "./types";

export async function handleSuccess(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<void> {
    core.info("Executing success actions...");
    if (settings.successAddPrLabels.length === 0) {
        core.info("No labels to add on success");
        return;
    }

    try {
        core.info("Adding labels to the PR...");
        await client.rest.issues.addLabels({
            owner: context.owner,
            repo: context.repo,
            issue_number: context.number,
            labels: settings.successAddPrLabels,
        });
        core.info(`Added labels: ${settings.successAddPrLabels.join(", ")} to the PR.`);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        core.warning(`Failed to add labels to the PR: ${msg}`);
    }
}

export async function handleFailure(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<void> {
    core.info("Executing failure actions...");

    const owner = context.owner;
    const repo = context.repo;
    const number = context.number;

    try {
        if (settings.failureRemovePrLabels.length > 0) {
            for (const label of settings.failureRemovePrLabels) {
                try {
                    await client.rest.issues.removeLabel({
                        owner,
                        repo,
                        issue_number: number,
                        name: label,
                    });
                } catch {
                    core.info(
                        `Could not remove label "${label}" from PR #${String(number)} as it was not found`,
                    );
                }
            }
            core.info(`Removed labels: ${settings.failureRemovePrLabels.join(", ")} from the PR.`);
        }

        if (settings.failureRemoveAllPrLabels) {
            await client.rest.issues.removeAllLabels({
                owner,
                repo,
                issue_number: number,
            });
            core.info(`Removed all labels from the PR.`);
        }

        if (settings.failureAddPrLabels.length > 0) {
            await client.rest.issues.addLabels({
                owner,
                repo,
                issue_number: number,
                labels: settings.failureAddPrLabels,
            });
            core.info(`Added labels: ${settings.failureAddPrLabels.join(", ")} to the PR.`);
        }

        if (settings.failurePrMessage !== "") {
            await client.rest.issues.createComment({
                owner,
                repo,
                issue_number: number,
                body: settings.failurePrMessage,
            });
            core.info(`Posted failure comment on the PR.`);
        }

        if (settings.closePr) {
            await client.rest.pulls.update({
                owner,
                repo,
                pull_number: number,
                state: "closed",
            });
            core.info(`Closed the PR.`);
        }

        if (settings.lockPr) {
            await client.rest.issues.lock({
                owner,
                repo,
                issue_number: number,
                lock_reason: "spam",
            });
            core.info(`Locked the PR.`);
        }

        if (settings.deleteBranch) {
            await client.rest.git.deleteRef({
                owner,
                repo,
                ref: `heads/${context.headBranch}`,
            });
            core.info(`Deleted source branch "${context.headBranch}" on the PR.`);
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        core.warning(`Failed to execute failure actions: ${msg}`);
    }
}
