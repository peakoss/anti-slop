export interface Settings {
    // Repo Auth Token
    githubToken: string;

    // General Settings
    maxFailures: number;

    // PR Branch Checks
    allowedTargetBranches: string[];
    blockedTargetBranches: string[];
    allowedSourceBranches: string[];
    blockedSourceBranches: string[];

    // PR Quality Checks
    maxNegativeReactions: number;
    requireMaintainerCanModify: boolean;

    // PR Title Checks
    requireConventionalTitle: boolean;

    // PR Description Checks
    requireDescription: boolean;
    maxDescriptionLength: number;
    maxEmojiCount: number;
    requireLinkedIssue: boolean;
    blockedTerms: string[];
    blockedIssueNumbers: string[];
    requirePrTemplate: boolean;
    strictPrTemplateSections: string[];
    optionalPrTemplateSections: string[];
    maxAdditionalPrTemplateSections: number;

    // Commit Message Checks
    maxCommitMessageLength: number;
    requireConventionalCommits: boolean;
    requireCommitAuthorMatch: boolean;

    // File Checks
    allowedFileExtensions: string[];
    allowedPaths: string[];
    blockedPaths: string[];
    requireFinalNewline: boolean;

    // User Checks
    minAccountAge: number;

    // Merge Checks
    minRepoMergedPrs: number;
    minRepoMergeRatio: number;
    minGlobalMergeRatio: number;
    globalMergeRatioExcludeOwn: boolean;

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

    // PR Success Actions
    successAddPrLabels: string[];

    // PR Failure Actions
    failureRemovePrLabels: string[];
    failureRemoveAllPrLabels: boolean;
    failureAddPrLabels: string[];
    failurePrMessage: string;
    closePr: boolean;
    lockPr: boolean;

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
