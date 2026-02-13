import * as core from "@actions/core";
import type { CheckResult, Settings } from "./types";

export function recordCheck(results: CheckResult[], result: CheckResult): void {
    const prefix = result.passed ? "PASS" : "FAIL";
    core.info(`[${prefix}] ${result.name} — ${result.message}`);
    results.push(result);
}

export function setOutputs(results: CheckResult[], settings: Settings): boolean {
    if (results.length === 0) {
        core.setOutput("total-checks", 0);
        core.setOutput("failed-checks", 0);
        core.setOutput("passed-checks", 0);
        core.setOutput("result", "skipped");
        return false;
    }

    const failed = results.filter((r) => !r.passed).length;
    const passed = results.length - failed;

    core.setOutput("total-checks", results.length);
    core.setOutput("failed-checks", failed);
    core.setOutput("passed-checks", passed);

    if (failed >= settings.maxFailures) {
        core.setOutput("result", "failed");
        return true;
    }
    return false;
}

export async function writeJobSummary(results: CheckResult[], settings: Settings): Promise<void> {
    if (results.length === 0) {
        core.summary.addHeading("PR Quality Checks - Skipped", "3");
        core.summary.addRaw("No checks were enabled or applicable for this PR.", true);

        await core.summary.write({ overwrite: true });
        return;
    }

    const failed = results.filter((r) => !r.passed);
    const passed = results.filter((r) => r.passed);

    const statusText = failed.length >= settings.maxFailures ? "Failed" : "Passed";
    core.summary.addHeading(`PR Quality Checks - ${statusText}`, "3");

    core.summary.addRaw(
        `${String(failed.length)}/${String(results.length)} checks failed` +
            ` · ${String(passed.length)} checks passed`,
        true,
    );

    const sorted = [...failed, ...passed];

    core.summary.addTable([
        [
            { data: "Result", header: true },
            { data: "Check", header: true },
            { data: "Details", header: true },
        ],
        ...sorted.map((r) => [r.passed ? "✅" : "❌", `<code>${r.name}</code>`, r.message]),
    ]);

    await core.summary.write({ overwrite: true });
}
