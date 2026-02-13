import * as core from "@actions/core";
import { getSettings } from "./settings.ts";
import { buildContext } from "./context.ts";
import { checkExemptions } from "./exemptions.ts";

export async function run(): Promise<void> {
    try {
        const isLocal = process.env["GITHUB_ACTIONS"] !== "true";

        const settings = getSettings();

        const context = buildContext();

        const exempt = checkExemptions(settings, context);
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("An unexpected error occurred");
        }
    }
}
