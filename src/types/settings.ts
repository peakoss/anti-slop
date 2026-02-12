export interface Settings {
    // Repo Auth Token
    githubToken: string;

    // General Settings
    maxFailures: number;
    actionsStepDebug: boolean;

    // PR Branch Checks
    allowedTargetBranches: string[];
    blockedTargetBranches: string[];
    allowedSourceBranches: string[];
    blockedSourceBranches: string[];

    // PR Title Checks
    requireConventionalTitle: boolean;

    // PR Description Checks
    requireDescription: boolean;
    maxDescriptionLength: number;
    maxEmojiCount: number;
    requirePrTemplate: boolean;
    requireLinkedIssue: boolean;
    blockedTerms: string[];
    blockedIssueNumbers: string[];

    // Commit Message Checks
    requireConventionalCommits: boolean;
    blockedCommitAuthors: string[];

    // File Checks
    allowedFileExtensions: string[];
    allowedPaths: string[];
    blockedPaths: string[];
    requireFinalNewline: boolean;

    // User Health Checks
    minRepoMergedPrs: number;
    minRepoMergeRatio: number;
    minGlobalMergeRatio: number;
    minAccountAge: number;

    // Filters
    // onlyIssueTypes: string[];
    // onlyLabels: string[];
    // onlyPrLabels: string[];
    // onlyIssueLabels: string[];
    // anyOfLabels: string[];
    // anyOfPrLabels: string[];
    // anyOfIssueLabels: string[];

    // Exemptions
    exemptDraftPrs: boolean;
    exemptBots: string[];
    exemptUsers: string[];
    exemptAuthorAssociation: string[];
    // exemptTeams: string[];
    exemptLabel: string;
    exemptPrLabel: string;
    // exemptIssueLabel: string;
    exemptAllMilestones: boolean;
    exemptAllPrMilestones: boolean;
    // exemptAllIssueMilestones: boolean;
    exemptMilestones: string[];
    exemptPrMilestones: string[];
    // exemptIssueMilestones: string[];

    // PR Close Actions
    closePr: boolean;
    lockPr: boolean;
    deleteBranch: boolean;

    // PR Failure Actions
    failurePrMessage: string;
    failureRemovePrLabels: string[];
    failureRemoveAllPrLabels: boolean;
    failureAddPrLabels: string[];

    // Issue Close Actions
    // closeIssue: boolean;
    // closeIssueReason: string;
    // lockIssue: boolean;

    // Issue Failure Actions
    // failureIssueMessage: string;
    // failureRemoveIssueLabels: string[];
    // failureRemoveAllIssueLabels: boolean;
    // failureAddIssueLabels: string[];
}
