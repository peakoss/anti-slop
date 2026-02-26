import * as core from "@actions/core";
import type { CheckResult, Context, Settings, Octokit } from "../types";
import { recordCheck } from "../report.ts";
import { commentPrefixesByExtension } from "../constants/comments.ts";

export async function runFileChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
    inheritedFiles: Set<string>,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const hasFileChecks =
        settings.allowedFileExtensions.length > 0 ||
        settings.allowedPaths.length > 0 ||
        settings.blockedPaths.length > 0 ||
        settings.requireFinalNewline ||
        settings.maxAddedComments > 0;

    if (!hasFileChecks) return results;

    const changedFiles = await client.paginate(client.rest.pulls.listFiles, {
        owner: context.owner,
        repo: context.repo,
        pull_number: context.number,
        per_page: 100,
    });

    // Exclude inherited files from the repo's default branch that the PR target branch hasn't caught up to yet.
    const files = changedFiles
        .filter((file) => !inheritedFiles.has(file.filename))
        .map((file) => ({
            name: file.filename,
            status: file.status,
            patch: file.patch,
        }));

    if (settings.allowedFileExtensions.length > 0) {
        const allowed = settings.allowedFileExtensions.map((extension) =>
            extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`,
        );
        const disallowed = files.filter((file) => {
            const filename = file.name.split("/").pop() ?? file.name;
            const dot = filename.lastIndexOf(".");
            return (
                dot > 0 && // dotfiles (.gitignore) and extensionless files (Makefile) are exempt from this check
                !allowed.includes(filename.slice(dot).toLowerCase())
            );
        });

        const passed = disallowed.length === 0;
        recordCheck(results, {
            name: "file-extensions",
            passed,
            message: passed
                ? "All changed files have allowed extensions"
                : `Found ${String(disallowed.length)} file(s) with disallowed extensions: "${disallowed.map((file) => file.name).join('", "')}"`,
        });
    }

    if (settings.allowedPaths.length > 0) {
        const disallowed = files.filter(
            (file) =>
                !settings.allowedPaths.some((pattern) =>
                    pattern.endsWith("/")
                        ? file.name.toLowerCase().startsWith(pattern.toLowerCase())
                        : file.name.toLowerCase() === pattern.toLowerCase(),
                ),
        );

        const passed = disallowed.length === 0;
        recordCheck(results, {
            name: "allowed-paths",
            passed,
            message: passed
                ? "All changed files are in allowed paths"
                : `Found ${String(disallowed.length)} file(s) outside allowed paths: "${disallowed.map((file) => file.name).join('", "')}"`,
        });
    }

    if (settings.blockedPaths.length > 0) {
        const blocked = files.filter((file) =>
            settings.blockedPaths.some((pattern) =>
                pattern.endsWith("/")
                    ? file.name.toLowerCase().startsWith(pattern.toLowerCase())
                    : file.name.toLowerCase() === pattern.toLowerCase(),
            ),
        );

        const passed = blocked.length === 0;
        recordCheck(results, {
            name: "blocked-paths",
            passed,
            message: passed
                ? "No changed files found in blocked paths"
                : `Found ${String(blocked.length)} file(s) in blocked paths: "${blocked.map((file) => file.name).join('", "')}"`,
        });
    }

    if (settings.requireFinalNewline) {
        const missing: string[] = [];

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
                            ref: context.headSha, // Use headSha instead of headBranch because if the PR is from a fork, the head branch name only exists in the fork repo and causes a 404 error when trying to get file content against the base repo.
                        });
                        if ("content" in data && typeof data.content === "string") {
                            const content = Buffer.from(data.content, "base64").toString("utf-8");
                            if (content.length > 0 && !content.endsWith("\n")) {
                                missing.push(file.name);
                            }
                        }
                    } catch {
                        core.warning(`Error checking final newline for file ${file.name}`);
                    }
                }),
        );

        const passed = missing.length === 0;
        recordCheck(results, {
            name: "final-newline",
            passed,
            message: passed
                ? "All changed files end with a newline"
                : `Found ${String(missing.length)} file(s) missing a final newline: "${missing.join('", "')}"`,
        });
    }

    if (settings.maxAddedComments > 0) {
        let totalComments = 0;

        for (const file of files) {
            if (file.status === "removed") continue;
            if (!file.patch) {
                core.debug(
                    `No patch data for ${file.name} (binary file or file diff is too large)`,
                );
                continue;
            }

            const ext = file.name.includes(".")
                ? (file.name.split(".").pop() ?? "").toLowerCase()
                : "";

            const prefixes = commentPrefixesByExtension.get(ext);
            if (!prefixes) continue;

            for (const line of file.patch.split("\n")) {
                if (!line.startsWith("+")) continue;
                if (
                    line === "+++ /dev/null" ||
                    line.startsWith("+++ a/") ||
                    line.startsWith("+++ b/")
                )
                    continue;

                const trimmed = line.slice(1).trim();
                if (prefixes.some((p) => trimmed.startsWith(p))) {
                    totalComments++;
                    core.debug(`Added comment in ${file.name}: ${trimmed}`);
                }
            }
        }

        const passed = totalComments <= settings.maxAddedComments;
        recordCheck(results, {
            name: "max-added-comments",
            passed,
            message: passed
                ? `Found ${String(totalComments)} added comment line(s), within the limit of ${String(settings.maxAddedComments)}`
                : `Found ${String(totalComments)} added comment line(s), exceeding the limit of ${String(settings.maxAddedComments)}`,
        });
    }

    return results;
}
