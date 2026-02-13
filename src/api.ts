import * as github from "@actions/github";
import type { Octokit } from "./types";

export function createClient(token: string): Octokit | null {
    if (!token || token.startsWith("${{")) return null;
    try {
        return github.getOctokit(token);
    } catch {
        return null;
    }
}
