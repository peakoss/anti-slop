import type { Context, Settings } from "../types";
import assert from "node:assert/strict";
import { test } from "node:test";
import { runDescriptionChecks } from "./description-checks.ts";

const MAX_CODE_REFERENCES = 3;
const CODE_REFERENCES_CHECK_NAME = "code-references";
const DOCUMENTATION_ONLY_DESCRIPTION = `
- [Change log requirements](https://icalendar.readthedocs.io/en/latest/contribute/#change-log-requirements)
- [Artificial intelligence policy](https://icalendar.readthedocs.io/en/latest/contribute/index.html#artificial-intelligence-policy)
- [Responsible AI use](https://icalendar.readthedocs.io/en/latest/contribute/index.html#responsible-ai-use)
- [Run tests](https://icalendar.readthedocs.io/en/latest/contribute/development.html#run-tests)
- [Style guide](https://icalendar.readthedocs.io/en/latest/contribute/documentation/style-guide.html)
`;

function makeSettings(overrides: Partial<Settings>): Settings {
	return {
		requireDescription: false,
		maxDescriptionLength: 0,
		maxEmojiCount: 0,
		blockedTerms: [],
		maxCodeReferences: 0,
		requireLinkedIssue: false,
		blockedIssueNumbers: [],
		...overrides,
	} as Settings;
}

const SETTINGS = makeSettings({ maxCodeReferences: MAX_CODE_REFERENCES });

function runCodeReferenceCheck(body: string) {
	const context = { body, title: "" } as Context;
	return runDescriptionChecks(SETTINGS, context).find(
		(result) => result.name === CODE_REFERENCES_CHECK_NAME,
	);
}

void test("does not count documentation URLs as code references", () => {
	assert.deepEqual(runCodeReferenceCheck(DOCUMENTATION_ONLY_DESCRIPTION), {
		name: CODE_REFERENCES_CHECK_NAME,
		passed: true,
		message: `Found 0 code reference(s), within maximum of ${String(MAX_CODE_REFERENCES)}`,
	});
});

void test("continues to count file paths and function calls", () => {
	assert.deepEqual(runCodeReferenceCheck("Changed src/checks/example.ts and validateResult()."), {
		name: CODE_REFERENCES_CHECK_NAME,
		passed: true,
		message: `Found 2 code reference(s), within maximum of ${String(MAX_CODE_REFERENCES)}`,
	});
});
