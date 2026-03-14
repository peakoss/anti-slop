import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setOutputs } from "./report.ts";

const defaultSettings = {
    githubToken: "",
    maxFailures: 4,
    allowedTargetBranches: [],
    blockedTargetBranches: [],
    allowedSourceBranches: [],
    blockedSourceBranches: [],
    maxNegativeReactions: 0,
    requireMaintainerCanModify: true,
    requireConventionalTitle: false,
    requireDescription: true,
    maxDescriptionLength: 2500,
    maxEmojiCount: 2,
    maxCodeReferences: 5,
    requireLinkedIssue: false,
    blockedTerms: [],
    blockedIssueNumbers: [],
    requirePrTemplate: false,
    strictPrTemplateSections: [],
    optionalPrTemplateSections: [],
    maxAdditionalPrTemplateSections: 0,
    maxCommitMessageLength: 500,
    requireConventionalCommits: false,
    requireCommitAuthorMatch: true,
    blockedCommitAuthors: [],
    allowedFileExtensions: [],
    allowedPaths: [],
    blockedPaths: [],
    requireFinalNewline: true,
    maxAddedComments: 10,
    detectSpamUsernames: true,
    minAccountAge: 30,
    maxDailyForks: 7,
    minProfileCompleteness: 4,
    minRepoMergedPrs: 0,
    minRepoMergeRatio: 0,
    minGlobalMergeRatio: 30,
    globalMergeRatioExcludeOwn: false,
    exemptDraftPrs: false,
    exemptBots: [],
    exemptUsers: [],
    exemptAuthorAssociation: [],
    exemptLabel: "exempt",
    exemptPrLabel: "",
    exemptAllMilestones: false,
    exemptAllPrMilestones: false,
    exemptMilestones: [],
    exemptPrMilestones: [],
    successAddPrLabels: [],
    failureRemovePrLabels: [],
    failureRemoveAllPrLabels: false,
    failureAddPrLabels: [],
    failurePrMessage: "",
    closePr: true,
    lockPr: false,
};

let outputDir = "";
let outputFile = "";
const originalGitHubOutput = process.env.GITHUB_OUTPUT;

function createSettings(overrides = {}) {
    return { ...defaultSettings, ...overrides };
}

function readOutputFile(filePath) {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const outputs = [];

    for (let index = 0; index < lines.length; ) {
        const currentLine = lines[index];
        if (currentLine === undefined || currentLine === "") {
            index++;
            continue;
        }

        const heredocIndex = currentLine.indexOf("<<");
        if (heredocIndex === -1) {
            throw new Error(`Unexpected output line: ${currentLine}`);
        }

        const name = currentLine.slice(0, heredocIndex);
        const delimiter = currentLine.slice(heredocIndex + 2);
        const valueLines = [];
        index++;

        while (index < lines.length && lines[index] !== delimiter) {
            valueLines.push(lines[index] ?? "");
            index++;
        }

        if (lines[index] !== delimiter) {
            throw new Error(`Missing delimiter "${delimiter}" for output "${name}"`);
        }

        outputs.push([name, valueLines.join("\n")]);
        index++;
    }

    return outputs;
}

beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), "anti-slop-report-"));
    outputFile = join(outputDir, "github-output.txt");
    writeFileSync(outputFile, "");
    process.env.GITHUB_OUTPUT = outputFile;
});

afterEach(() => {
    if (originalGitHubOutput === undefined) {
        delete process.env.GITHUB_OUTPUT;
    } else {
        process.env.GITHUB_OUTPUT = originalGitHubOutput;
    }

    rmSync(outputDir, { recursive: true, force: true });
});

describe("setOutputs", () => {
    it("returns skipped outputs when no checks ran", () => {
        const failed = setOutputs([], createSettings());

        assert.equal(failed, false);
        assert.deepEqual(readOutputFile(outputFile), [
            ["total-checks", "0"],
            ["failed-checks", "0"],
            ["passed-checks", "0"],
            ["result", "skipped"],
        ]);
    });

    it("returns failed outputs when failures reach the threshold", () => {
        const results = [
            { name: "check-a", passed: false, message: "first failure" },
            { name: "check-b", passed: false, message: "second failure" },
            { name: "check-c", passed: true, message: "pass" },
        ];

        const failed = setOutputs(results, createSettings({ maxFailures: 2 }));

        assert.equal(failed, true);
        assert.deepEqual(readOutputFile(outputFile), [
            ["total-checks", "3"],
            ["failed-checks", "2"],
            ["passed-checks", "1"],
            ["result", "failed"],
        ]);
    });

    it("returns passed outputs when failures stay below the threshold", () => {
        const results = [
            { name: "check-a", passed: false, message: "single failure" },
            { name: "check-b", passed: true, message: "first pass" },
            { name: "check-c", passed: true, message: "second pass" },
        ];

        const failed = setOutputs(results, createSettings({ maxFailures: 2 }));

        assert.equal(failed, false);
        assert.deepEqual(readOutputFile(outputFile), [
            ["total-checks", "3"],
            ["failed-checks", "1"],
            ["passed-checks", "2"],
            ["result", "passed"],
        ]);
    });
});
