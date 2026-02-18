import type { CheckResult, Context, Settings, Octokit, UserProfile } from "../types";
import { recordCheck } from "../report.ts";

const SPAM_USERNAME_PATTERNS: { pattern: RegExp; reason: string }[] = [
    { pattern: /^\d+$/, reason: "username is all digits" },
    { pattern: /\d{4,}$/, reason: "username ends with 4 or more digits" },
];

export async function runUserChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const user = context.userLogin;
    const needsProfile = settings.minProfileCompleteness > 0 || settings.minAccountAge > 0;

    const [profile, dailyForkCount] = await Promise.all([
        needsProfile ? getUserProfile(client, user) : Promise.resolve(null),
        settings.maxDailyForks > 0 ? countDailyForks(client, user) : Promise.resolve(0),
    ]);

    if (settings.detectSpamUsernames) {
        const matched = SPAM_USERNAME_PATTERNS.filter((entry) => entry.pattern.test(user));

        const passed = matched.length === 0;
        recordCheck(results, {
            name: "detect-spam-usernames",
            passed,
            message: passed
                ? `Username "${user}" does not match spam patterns`
                : `Username "${user}" matches spam patterns: ${matched.map((entry) => entry.reason).join(", ")}`,
        });
    }

    if (settings.minAccountAge > 0 && profile) {
        const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
        const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

        const passed = accountAgeDays >= settings.minAccountAge;
        recordCheck(results, {
            name: "account-age",
            passed,
            message: passed
                ? `Account is ${String(accountAgeDays)} day(s) old, meets minimum of ${String(settings.minAccountAge)} days`
                : `Account is ${String(accountAgeDays)} day(s) old, below minimum of ${String(settings.minAccountAge)} days`,
        });
    }

    if (settings.maxDailyForks > 0) {
        const passed = dailyForkCount <= settings.maxDailyForks;
        recordCheck(results, {
            name: "max-daily-forks",
            passed,
            message: passed
                ? `User created ${String(dailyForkCount)} fork(s) in a 24-hour window, within maximum of ${String(settings.maxDailyForks)}`
                : `User created ${String(dailyForkCount)} fork(s) in a 24-hour window, exceeds maximum of ${String(settings.maxDailyForks)}`,
        });
    }

    if (settings.minProfileCompleteness > 0 && profile) {
        const fields: { label: string; present: boolean }[] = [
            { label: "public profile", present: profile.user_view_type === "public" },
            { label: "name", present: !!profile.name },
            { label: "company", present: !!profile.company },
            { label: "blog", present: !!profile.blog },
            { label: "location", present: !!profile.location },
            { label: "email", present: !!profile.email },
            { label: "hireable", present: profile.hireable !== null },
            { label: "bio", present: !!profile.bio },
            { label: "twitter", present: !!profile.twitter_username },
            { label: "followers", present: profile.followers > 0 },
            { label: "following", present: profile.following > 0 },
        ];

        const completedCount = fields.filter((field) => field.present).length;
        const missing = fields.filter((field) => !field.present).map((field) => field.label);

        const passed = completedCount >= settings.minProfileCompleteness;
        recordCheck(results, {
            name: "min-profile-completeness",
            passed,
            message: passed
                ? `Profile completeness is ${String(completedCount)}/11, meets minimum of ${String(settings.minProfileCompleteness)}`
                : `Profile completeness is ${String(completedCount)}/11, below minimum of ${String(settings.minProfileCompleteness)} (missing: ${missing.join(", ")})`,
        });
    }

    return results;
}

async function getUserProfile(client: Octokit, username: string): Promise<UserProfile> {
    const { data } = await client.rest.users.getByUsername({ username });
    return {
        user_view_type: data.user_view_type ?? "private",
        name: data.name,
        company: data.company,
        blog: data.blog,
        location: data.location,
        email: data.email,
        hireable: data.hireable,
        bio: data.bio,
        twitter_username: data.twitter_username ?? null,
        followers: data.followers,
        following: data.following,
        created_at: data.created_at,
    };
}

async function countDailyForks(client: Octokit, username: string): Promise<number> {
    const repos = await client.paginate(client.rest.repos.listForUser, {
        username,
        type: "owner",
        sort: "created",
        direction: "desc",
        per_page: 100,
    });

    const forkTimestamps = repos
        .filter((repo) => repo.fork)
        .map((repo) => new Date(repo.created_at ?? "").getTime())
        .sort((a, b) => a - b);

    if (forkTimestamps.length === 0) {
        return 0;
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    let maxForks = 0;
    let left = 0;

    for (let right = 0; right < forkTimestamps.length; right++) {
        while ((forkTimestamps[right] ?? 0) - (forkTimestamps[left] ?? 0) > DAY_MS) {
            left++;
        }
        maxForks = Math.max(maxForks, right - left + 1);
    }

    return maxForks;
}
