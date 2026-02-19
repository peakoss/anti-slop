import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

export async function runUserChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const hasUserChecks = settings.minAccountAge > 0;

    if (!hasUserChecks) return results;

    const user = context.userLogin;

    const createdAt = settings.minAccountAge > 0 ? await getUserCreatedAt(client, user) : "";

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
