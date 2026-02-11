export enum Input {
    // Repo Auth Token
    GithubToken = "github-token",

    // General Settings
    MaxFailures = "max-failures",
    ActionsStepDebug = "actions-step-debug",

    // PR Branch Checks
    // Branches can contain "," so we use newline-separated (multiline) values to configure these.
    AllowedTargetBranches = "allowed-target-branches",
    BlockedTargetBranches = "blocked-target-branches",
    AllowedSourceBranches = "allowed-source-branches",
    BlockedSourceBranches = "blocked-source-branches",

    // PR Title Checks
    RequireConventionalTitle = "require-conventional-title",

    // PR Description Checks
    RequireDescription = "require-description",
    MaxDescriptionLength = "max-description-length",
    MaxEmojiCount = "max-emoji-count",
    RequirePrTemplate = "require-pr-template",
    RequireLinkedIssue = "require-linked-issue",
    BlockedTerms = "blocked-terms",
    BlockedIssueNumbers = "blocked-issue-numbers",

    // Commit Message Checks
    RequireConventionalCommits = "require-conventional-commits",
    BlockedCommitAuthors = "blocked-commit-authors",

    // File Checks
    AllowedFileExtensions = "allowed-file-extensions",
    AllowedPaths = "allowed-paths",
    BlockedPaths = "blocked-paths",
    RequireFinalNewline = "require-final-newline",

    // User Health Checks
    MinRepoMergedPrs = "min-repo-merged-prs",
    MinRepoMergeRatio = "min-repo-merge-ratio",
    MinGlobalMergeRatio = "min-global-merge-ratio",
    MinAccountAge = "min-account-age",

    // Filters
    // OnlyIssueTypes = "only-issue-types",
    // OnlyLabels = "only-labels",
    // OnlyPrLabels = "only-pr-labels",
    // OnlyIssueLabels = "only-issue-labels",
    // AnyOfLabels = "any-of-labels",
    // AnyOfPrLabels = "any-of-pr-labels",
    // AnyOfIssueLabels = "any-of-issue-labels",

    // Exemptions
    ExemptAuthorAssociation = "exempt-author-association", // Uses author association instead of repository permission roles (e.g. "admin", "write", "triage") because author association does not require an additional API call per user.
    // ExemptTeams = "exempt-teams",
    ExemptUsers = "exempt-users",
    ExemptBots = "exempt-bots",
    ExemptDraftPrs = "exempt-draft-prs",
    ExemptLabel = "exempt-label",
    ExemptPrLabel = "exempt-pr-label",
    // ExemptIssueLabel = "exempt-issue-label",
    // ExemptMilestones = "exempt-milestones",
    // ExemptPrMilestones = "exempt-pr-milestones",
    // ExemptIssueMilestones = "exempt-issue-milestones",
    // ExemptAllMilestones = "exempt-all-milestones",
    // ExemptAllPrMilestones = "exempt-all-pr-milestones",
    // ExemptAllIssueMilestones = "exempt-all-issue-milestones",

    // PR Close Actions
    ClosePr = "close-pr",
    LockPr = "lock-pr",
    DeleteBranch = "delete-branch",

    // PR Failure Actions
    FailurePrMessage = "failure-pr-message",
    FailureRemovePrLabels = "failure-remove-pr-labels",
    FailureRemoveAllPrLabels = "failure-remove-all-pr-labels",
    FailureAddPrLabels = "failure-add-pr-labels",

    // Issue Close Actions
    // CloseIssue = "close-issue",
    // CloseIssueReason = "close-issue-reason",
    // LockIssue = "lock-issue",

    // Issue Failure Actions
    // FailureIssueMessage = "failure-issue-message",
    // FailureRemoveIssueLabels = "failure-remove-issue-labels",
    // FailureRemoveAllIssueLabels = "failure-remove-all-issue-labels",
    // FailureAddIssueLabels = "failure-add-issue-labels",
}
