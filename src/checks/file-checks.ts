import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";

export async function runFileChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const hasFileChecks =
        settings.allowedFileExtensions.length > 0 ||
        settings.allowedPaths.length > 0 ||
        settings.blockedPaths.length > 0 ||
        settings.requireFinalNewline;

    if (!hasFileChecks) return results;

    const changedFiles = await client.paginate(client.rest.pulls.listFiles, {
        owner: context.owner,
        repo: context.repo,
        pull_number: context.number,
        per_page: 100,
    });

    const files = changedFiles.map((file) => ({
        name: file.filename,
        status: file.status,
    }));

    if (settings.allowedFileExtensions.length > 0) {
        const allowed = settings.allowedFileExtensions.map((extension) =>
            extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`,
        );
        const passed = files.every((file) => {
            const filename = file.name.split("/").pop() ?? file.name;
            const dot = filename.lastIndexOf(".");

            return (
                dot <= 0 || // dotfiles (.gitignore) and extensionless files (Makefile) are exempt from this check
                allowed.includes(filename.slice(dot).toLowerCase())
            );
        });

        recordCheck(results, {
            name: "file-extensions",
            passed,
            message: passed
                ? "All file extensions are permitted"
                : "Found file(s) with disallowed extension(s)",
        });
    }

    if (settings.allowedPaths.length > 0) {
        const passed = files.every((file) =>
            settings.allowedPaths.some((pattern) =>
                pattern.endsWith("/")
                    ? file.name.toLowerCase().startsWith(pattern.toLowerCase())
                    : file.name.toLowerCase() === pattern.toLowerCase(),
            ),
        );

        recordCheck(results, {
            name: "allowed-paths",
            passed,
            message: passed
                ? "All changed files are in allowed paths"
                : "Found changed file(s) outside allowed paths",
        });
    }

    if (settings.blockedPaths.length > 0) {
        const passed = !files.some((file) =>
            settings.blockedPaths.some((pattern) =>
                pattern.endsWith("/")
                    ? file.name.toLowerCase().startsWith(pattern.toLowerCase())
                    : file.name.toLowerCase() === pattern.toLowerCase(),
            ),
        );

        recordCheck(results, {
            name: "blocked-paths",
            passed,
            message: passed
                ? "No changes in blocked paths"
                : "Found changed file(s) in blocked paths",
        });
    }

    if (settings.requireFinalNewline) {
        const passed = (
            await Promise.all(
                files
                    .filter((file) => file.status !== "removed")
                    .slice(0, 30)
                    .map(async (file) => {
                        try {
                            const { data } = await client.rest.repos.getContent({
                                owner: context.owner,
                                repo: context.repo,
                                path: file.name,
                                ref: context.headBranch,
                            });
                            if ("content" in data && typeof data.content === "string") {
                                const content = Buffer.from(data.content, "base64").toString(
                                    "utf-8",
                                );
                                return content.length === 0 || content.endsWith("\n");
                            }
                            return true;
                        } catch {
                            return true;
                        }
                    }),
            )
        ).every(Boolean);

        recordCheck(results, {
            name: "final-newline",
            passed,
            message: passed
                ? "All changed files end with a newline"
                : "Found file(s) missing a final newline",
        });
    }

    return results;
}
