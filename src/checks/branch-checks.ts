import type { CheckResult, Context, Settings } from "../types";
import { recordCheck } from "../report.ts";

export function runBranchChecks(settings: Settings, context: Context): CheckResult[] {
    const results: CheckResult[] = [];

    if (settings.allowedTargetBranches.length > 0 || settings.blockedTargetBranches.length > 0) {
        const branch = context.baseBranch;

        if (
            settings.allowedTargetBranches.length > 0 &&
            !settings.allowedTargetBranches.some((pattern) => matchBranch(branch, pattern))
        ) {
            recordCheck(results, {
                name: "target-branch",
                passed: false,
                message: `Target branch "${branch}" is not allowed`,
            });
        } else if (settings.blockedTargetBranches.some((pattern) => matchBranch(branch, pattern))) {
            recordCheck(results, {
                name: "target-branch",
                passed: false,
                message: `Target branch "${branch}" is blocked`,
            });
        } else {
            recordCheck(results, {
                name: "target-branch",
                passed: true,
                message: `Target branch "${branch}" is allowed`,
            });
        }
    }

    if (settings.allowedSourceBranches.length > 0 || settings.blockedSourceBranches.length > 0) {
        const branch = context.headBranch;

        if (
            settings.allowedSourceBranches.length > 0 &&
            !settings.allowedSourceBranches.some((pattern) => matchBranch(branch, pattern))
        ) {
            recordCheck(results, {
                name: "source-branch",
                passed: false,
                message: `Source branch "${branch}" is not allowed`,
            });
        } else if (settings.blockedSourceBranches.some((pattern) => matchBranch(branch, pattern))) {
            recordCheck(results, {
                name: "source-branch",
                passed: false,
                message: `Source branch "${branch}" is blocked`,
            });
        } else {
            recordCheck(results, {
                name: "source-branch",
                passed: true,
                message: `Source branch "${branch}" is allowed`,
            });
        }
    }

    return results;
}

function matchBranch(branch: string, pattern: string): boolean {
    if (pattern.includes("*")) {
        const ph = "\0";
        const source = pattern
            .replace(/\*\*/g, ph)
            .split("*")
            .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[^/]*") // Regex [^/]* is equivalent to the * glob pattern (matches any character except /)
            .replace(new RegExp(ph, "g"), ".*"); // Regex .* is equivalent to the ** glob pattern (matches any character)
        return new RegExp("^" + source + "$").test(branch);
    }
    return branch === pattern;
}
