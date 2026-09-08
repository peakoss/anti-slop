import type { Context, Octokit, Settings } from "../types";
import { describe, expect, test } from "bun:test";
import { runMergeChecks } from "./merge-checks.ts";

const NON_SEARCHABLE_MESSAGE =
	'Validation Failed: {"message":"The listed users cannot be searched either because the users do not exist or you do not have permission to view the users.","resource":"Search","field":"q","code":"invalid"} - https://docs.github.com/v3/search/';

function makeSettings(overrides: Partial<Settings>): Settings {
	return {
		minRepoMergedPrs: 0,
		minRepoMergeRatio: 0,
		minGlobalMergeRatio: 0,
		globalMergeRatioExcludeOwn: false,
		...overrides,
	} as Settings;
}

function makeContext(): Context {
	return {
		owner: "peakoss",
		repo: "anti-slop",
		userLogin: "flagged-spam-user",
		authorAssociation: "NONE",
	} as Context;
}

function makeSearchClient(search: () => Promise<{ data: { total_count: number } }>): Octokit {
	return {
		rest: { search: { issuesAndPullRequests: search } },
	} as unknown as Octokit;
}

describe("runMergeChecks", () => {
	test("skips merge checks when the contributor cannot be searched", async () => {
		const error = Object.assign(new Error(NON_SEARCHABLE_MESSAGE), { status: 422 });
		const client = makeSearchClient(() => Promise.reject(error));

		const results = await runMergeChecks(
			makeSettings({ minGlobalMergeRatio: 50 }),
			makeContext(),
			client,
			false,
		);

		expect(results).toEqual([]);
	});

	test("rethrows unrelated search errors instead of masking them", async () => {
		const error = Object.assign(new Error("API rate limit exceeded"), { status: 403 });
		const client = makeSearchClient(() => Promise.reject(error));

		let thrown: unknown;
		try {
			await runMergeChecks(
				makeSettings({ minGlobalMergeRatio: 50 }),
				makeContext(),
				client,
				false,
			);
		} catch (caught: unknown) {
			thrown = caught;
		}

		expect(thrown).toBe(error);
	});

	test("records the global merge ratio check when the search succeeds", async () => {
		let call = 0;
		const client = makeSearchClient(() => {
			call += 1;
			// First query counts merged PRs, second counts unmerged closed PRs.
			return Promise.resolve({ data: { total_count: call === 1 ? 8 : 2 } });
		});

		const results = await runMergeChecks(
			makeSettings({ minGlobalMergeRatio: 50 }),
			makeContext(),
			client,
			false,
		);

		expect(results).toHaveLength(1);
		expect(results[0]?.name).toBe("global-merge-ratio");
		expect(results[0]?.passed).toBe(true);
	});
});
