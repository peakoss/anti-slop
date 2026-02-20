import type { CheckResult, Context, Settings } from "../types";
import { recordCheck } from "../report.ts";

// Matches: type: description, type(scope): description, type(scope)!: description...
// @TODO: Maybe add a setting to restrict allowed conventional commit types or restrict them by default as for now it accepts any type (\w+).
const CONVENTIONAL_PATTERN = /^(\w+)(?:\([^)]+\))?!?:\s.+/;

export function runTitleChecks(settings: Settings, context: Context): CheckResult[] {
    const results: CheckResult[] = [];

    if (settings.requireConventionalTitle) {
        const match = CONVENTIONAL_PATTERN.exec(context.title);
        const type = match?.[1];
        const passed = type !== undefined;
        recordCheck(results, {
            name: "conventional-title",
            passed,
            message: passed
                ? `PR title "${context.title}" follows conventional commits format`
                : `PR title "${context.title}" does not follow conventional commits format`,
        });
    }

    return results;
}
