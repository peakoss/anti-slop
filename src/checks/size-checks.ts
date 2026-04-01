import type { CheckResult, Context, Settings } from "../types";
import { recordCheck } from "../report.ts";

export function runSizeChecks(settings: Settings, context: Context): CheckResult[] {
	const results: CheckResult[] = [];

	if (settings.maxChangedFiles > 0) {
		const passed = context.changedFiles <= settings.maxChangedFiles;
		recordCheck(results, {
			name: "max-changed-files",
			passed,
			message: passed
				? `PR has ${String(context.changedFiles)} changed file(s), within maximum of ${String(settings.maxChangedFiles)}`
				: `PR has ${String(context.changedFiles)} changed file(s), exceeds maximum of ${String(settings.maxChangedFiles)}`,
		});
	}

	if (settings.maxChangedLines > 0) {
		const changedLines = context.additions + context.deletions;
		const passed = changedLines <= settings.maxChangedLines;
		recordCheck(results, {
			name: "max-changed-lines",
			passed,
			message: passed
				? `PR has ${String(changedLines)} changed line(s), within maximum of ${String(settings.maxChangedLines)}`
				: `PR has ${String(changedLines)} changed line(s), exceeds maximum of ${String(settings.maxChangedLines)}`,
		});
	}

	return results;
}
