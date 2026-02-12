import { Input } from "./enums/input.ts";
import type { Settings } from "./types";
import * as core from "@actions/core";

const VALID_AUTHOR_ASSOCIATIONS = [
    "COLLABORATOR",
    "CONTRIBUTOR",
    "FIRST_TIMER",
    "FIRST_TIME_CONTRIBUTOR",
    "MANNEQUIN",
    "MEMBER",
    "NONE",
    "OWNER",
];

function parseList(raw: string): string[] {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export function getSettings(): Settings {
    const settings = {
        // Repo Auth Token
        githubToken: core.getInput(Input.GithubToken, { required: true }),

        // General Settings
        maxFailures: parseInt(core.getInput(Input.MaxFailures)),
        actionsStepDebug: core.getBooleanInput(Input.ActionsStepDebug),

        // PR Branch Checks
        allowedTargetBranches: core.getMultilineInput(Input.AllowedTargetBranches),
        blockedTargetBranches: core.getMultilineInput(Input.BlockedTargetBranches),
        allowedSourceBranches: core.getMultilineInput(Input.AllowedSourceBranches),
        blockedSourceBranches: core.getMultilineInput(Input.BlockedSourceBranches),

        // PR Title Checks
        requireConventionalTitle: core.getBooleanInput(Input.RequireConventionalTitle),

        // PR Description Checks
        requireDescription: core.getBooleanInput(Input.RequireDescription),
        maxDescriptionLength: parseInt(core.getInput(Input.MaxDescriptionLength)),
        maxEmojiCount: parseInt(core.getInput(Input.MaxEmojiCount)),
        requirePrTemplate: core.getBooleanInput(Input.RequirePrTemplate),
        requireLinkedIssue: core.getBooleanInput(Input.RequireLinkedIssue),
        blockedTerms: core.getMultilineInput(Input.BlockedTerms),
        blockedIssueNumbers: parseList(core.getInput(Input.BlockedIssueNumbers)),

        // Commit Message Checks
        requireConventionalCommits: core.getBooleanInput(Input.RequireConventionalCommits),
        blockedCommitAuthors: parseList(core.getInput(Input.BlockedCommitAuthors)),

        // File Checks
        allowedFileExtensions: parseList(core.getInput(Input.AllowedFileExtensions)),
        allowedPaths: core.getMultilineInput(Input.AllowedPaths),
        blockedPaths: core.getMultilineInput(Input.BlockedPaths),
        requireFinalNewline: core.getBooleanInput(Input.RequireFinalNewline),

        // User Health Checks
        minRepoMergedPrs: parseInt(core.getInput(Input.MinRepoMergedPrs)),
        minRepoMergeRatio: parseInt(core.getInput(Input.MinRepoMergeRatio)),
        minGlobalMergeRatio: parseInt(core.getInput(Input.MinGlobalMergeRatio)),
        minAccountAge: parseInt(core.getInput(Input.MinAccountAge)),

        // Filters
        // onlyIssueTypes: parseList(core.getInput(Input.OnlyIssueTypes)),
        // onlyLabels: parseList(core.getInput(Input.OnlyLabels)),
        // onlyPrLabels: parseList(core.getInput(Input.OnlyPrLabels)),
        // onlyIssueLabels: parseList(core.getInput(Input.OnlyIssueLabels)),
        // anyOfLabels: parseList(core.getInput(Input.AnyOfLabels)),
        // anyOfPrLabels: parseList(core.getInput(Input.AnyOfPrLabels)),
        // anyOfIssueLabels: parseList(core.getInput(Input.AnyOfIssueLabels)),

        // Exemptions
        exemptDraftPrs: core.getBooleanInput(Input.ExemptDraftPrs),
        exemptBots: core.getMultilineInput(Input.ExemptBots),
        exemptUsers: parseList(core.getInput(Input.ExemptUsers)),
        exemptAuthorAssociation: parseList(core.getInput(Input.ExemptAuthorAssociation)),
        // exemptTeams: parseList(core.getInput(Input.ExemptTeams)),
        exemptLabel: core.getInput(Input.ExemptLabel),
        exemptPrLabel: core.getInput(Input.ExemptPrLabel),
        // exemptIssueLabel: core.getInput(Input.ExemptIssueLabel),
        exemptAllMilestones: core.getBooleanInput(Input.ExemptAllMilestones),
        exemptAllPrMilestones: core.getBooleanInput(Input.ExemptAllPrMilestones),
        // exemptAllIssueMilestones: core.getBooleanInput(Input.ExemptAllIssueMilestones),
        exemptMilestones: parseList(core.getInput(Input.ExemptMilestones)),
        exemptPrMilestones: parseList(core.getInput(Input.ExemptPrMilestones)),
        // exemptIssueMilestones: parseList(core.getInput(Input.ExemptIssueMilestones)),

        // PR Close Actions
        closePr: core.getBooleanInput(Input.ClosePr),
        lockPr: core.getBooleanInput(Input.LockPr),
        deleteBranch: core.getBooleanInput(Input.DeleteBranch),

        // PR Failure Actions
        failurePrMessage: core.getInput(Input.FailurePrMessage),
        failureRemovePrLabels: parseList(core.getInput(Input.FailureRemovePrLabels)),
        failureRemoveAllPrLabels: core.getBooleanInput(Input.FailureRemoveAllPrLabels),
        failureAddPrLabels: parseList(core.getInput(Input.FailureAddPrLabels)),

        // Issue Close Actions
        // closeIssue: core.getBooleanInput(Input.CloseIssue),
        // closeIssueReason: core.getInput(Input.CloseIssueReason),
        // lockIssue: core.getBooleanInput(Input.LockIssue),

        // Issue Failure Actions
        // failureIssueMessage: core.getInput(Input.FailureIssueMessage),
        // failureRemoveIssueLabels: parseList(core.getInput(Input.FailureRemoveIssueLabels)),
        // failureRemoveAllIssueLabels: core.getBooleanInput(Input.FailureRemoveAllIssueLabels),
        // failureAddIssueLabels: parseList(core.getInput(Input.FailureAddIssueLabels)),
    };

    core.setSecret(settings.githubToken);

    validateSettings(settings);

    core.debug(`Settings:\n${JSON.stringify(settings, null, 2)}`);

    return settings;
}

function validateNumber(value: number, name: string, min: number, max: number): void {
    if (isNaN(value)) {
        throw new Error(`"${name}" must be a valid number`);
    }
    if (value < min || value > max) {
        throw new Error(`"${name}" must be between ${min} and ${max}, got ${value}`);
    }
}

function validateSettings(settings: Settings): void {
    validateNumber(settings.maxFailures, "max-failures", 1, 30);
    validateNumber(settings.maxDescriptionLength, "max-description-length", 0, 100000);
    validateNumber(settings.maxEmojiCount, "max-emoji-count", 0, 50);
    validateNumber(settings.minRepoMergedPrs, "min-repo-merged-prs", 0, 20);
    validateNumber(settings.minRepoMergeRatio, "min-repo-merge-ratio", 0, 100);
    validateNumber(settings.minGlobalMergeRatio, "min-global-merge-ratio", 0, 100);
    validateNumber(settings.minAccountAge, "min-account-age", 0, 90);

    for (const association of settings.exemptAuthorAssociation) {
        if (!VALID_AUTHOR_ASSOCIATIONS.includes(association)) {
            throw new Error(
                `"exempt-author-association" contains invalid value "${association}". ` +
                    `The valid values are: ${VALID_AUTHOR_ASSOCIATIONS.join(", ")}`,
            );
        }
    }
}
