import * as core from "@actions/core";
import type { Context, InheritedData, Octokit } from "./types";

export async function getInheritedData(context: Context, client: Octokit): Promise<InheritedData> {
    if (context.baseBranch === context.defaultBranch) return { shas: new Set(), files: new Set() };

    const { data } = await client.rest.repos.compareCommitsWithBasehead({
        owner: context.owner,
        repo: context.repo,
        basehead: `${context.baseBranch}...${context.defaultBranch}`,
    });

    const shas = new Set(data.commits.map((commit) => commit.sha));
    const files = new Set((data.files ?? []).map((file) => file.filename));

    for (const { commit } of data.commits) {
        core.info(`Inherited commit "${commit.message.split("\n")[0] ?? ""}"`);
    }
    for (const { filename } of data.files ?? []) {
        core.info(`Inherited file: "${filename}"`);
    }

    core.info(
        `Found ${String(shas.size)} inherited commit(s) and ${String(files.size)} inherited file(s)`,
    );

    return { shas, files };
}
