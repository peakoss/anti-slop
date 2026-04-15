import type { Octokit } from "./types";
import * as github from "@actions/github";

export function createClient(token: string): Octokit | null {
	if (!token || token.startsWith("${{")) return null;
	try {
		return github.getOctokit(token);
	} catch {
		return null;
	}
}
