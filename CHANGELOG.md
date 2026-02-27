# Changelog

All notable changes to this project will be documented in this file.

## [v0.2.1] - 2026-02-27

### Fixed

- Inherited files from the default branch incorrectly included in file checks. When the PR targets a branch other than the default (e.g. `next`), files the target branch hasn't caught up to yet were incorrectly also evaluated, causing false positives on file checks.
- Multiline comments counted as individual comments
- Shortcode emojis not counted by the emoji check
- Checkboxes inside blockquotes not detected by the PR template check, which could cause checkbox-based checks to pass when they should not
- Missing strict sections passes the `strictPrTemplateSections` check
- Duplicated "Missing section" prefix in the template check info message

### Refactored

- Extract inherited data detection out of the commit checks so both commit and file checks share a single comparison call

## [v0.2.0] - 2026-02-25

Adds 9 new checks that cover more than 20 quality signals.

### Breaking Changes

- Remove `deleteBranch` option as it requires `content: write` permissions and does not work on forks
- Set sensible maximums for all integer input options

### Added

- `requireCommitAuthorMatch` option that matches the PR author against each commit author, catching commits authored solely by AI and commits not linked to a GitHub account
- `maxCommitMessageLength` option to catch AI stuffing a lot of text into commit messages
- 3 new user checks: `detectSpamUsernames`, `maxDailyForks` and `minProfileCompleteness`
  - `detectSpamUsernames` flags usernames matching common spam patterns (all digits, 4+ consecutive digits, contains `-ai` or `ai-`)
  - `maxDailyForks` checks the number of repositories forked by the user in any 24-hour window
  - `minProfileCompleteness` checks 11 profile signals (`public profile`, `name`, `company`, `blog`, `location`, `email`, `hireable`, `bio`, `twitter`, `followers`, `following`) against a configurable minimum
- 3 new settings for the PR template check: `strictPrTemplateSections`, `optionalPrTemplateSections` and `maxAdditionalPrTemplateSections`
  - `strictPrTemplateSections` classifies sections where all checkboxes must be present and checked
  - `optionalPrTemplateSections` classifies sections that can be entirely removed without failing
  - `maxAdditionalPrTemplateSections` limits extra sections not defined in the template
- `maxCodeReferences` option to limit the number of code references (file paths, function calls, method calls) in the PR description
- `maxAddedComments` option to limit the number of comments added in all changed files

### Changed

- Use `authorAssociation` instead of the search API when `minRepoMergedPrs` is `1` for improved performance
- `max-failures` default from `3` to `4`
- `maxDescriptionLength` default from `0` to `2500`
- `minAccountAge` default from `7` to `30`
- Improve and streamline check info messages

### Fixed

- Exclude inherited default-branch commits from commit checks. Commits from the repo's default branch (e.g. `main`) that the base (target) branch (e.g. `next`) of the PR hasn't caught up to yet are now excluded to avoid false positives, since these commits are already integrated.
- Use `headSha` instead of `headBranch` for the newline check because if the PR is from a fork, the head branch name only exists in the fork repo and causes a `404` error when fetching file content against the base repo

### Refactored

- Run user merge checks as a separate group
- Run PR template checks as a separate group
- Make description checks synchronous (no longer require the GitHub API) after extracting the PR template checks into their own group
- Replace short variables with full-length ones
- Streamline `action.yaml` input descriptions

### Maintenance

- `typescript-eslint/consistent-generic-constructors` rule set to `type-annotation` for compatibility with `isolatedDeclarations`
- Add debug logging to excluded commits
- Update readme with new and removed options
- Update total number of checks
- Remove `node_modules` and do a fresh install before building in the release script
- Show build time and suppress the default git tag message in the release script
- Add missing payload fields to test events
- Add real user test event

## [v0.1.1] - 2026-02-15

### Fixed

- False positives in the blocked terms check by stripping comments from the description body before evaluation. A honeypot term placed inside a comment would always trigger a failure if the user did not remove the comment.

## [v0.1.0] - 2026-02-14

Initial release with 15 checks covering PR title, description, commits, user health and more.

### Added

- `max-failures` setting to control how many check failures trigger failure actions
- Branch checks: `allowed-target-branches`, `blocked-target-branches`, `allowed-source-branches`, `blocked-source-branches`
- Title checks: `require-conventional-title`
- Description checks: `require-description`, `max-description-length`, `max-emoji-count`, `require-pr-template`, `require-linked-issue`, `blocked-terms`, `blocked-issue-numbers`
- Commit checks: `require-conventional-commits`, `blocked-commit-authors`
- File checks: `allowed-file-extensions`, `allowed-paths`, `blocked-paths`, `require-final-newline`
- User checks: `min-repo-merged-prs`, `min-repo-merge-ratio`, `min-global-merge-ratio`, `global-merge-ratio-exclude-own`, `min-account-age`
- Quality checks: `max-negative-reactions`, `require-maintainer-can-modify`
- Exemptions: `exempt-author-association`, `exempt-users`, `exempt-bots`, `exempt-draft-prs`, `exempt-label`, `exempt-pr-label`, `exempt-milestones`, `exempt-pr-milestones`, `exempt-all-milestones`, `exempt-all-pr-milestones`
- Success actions: `success-add-pr-labels`
- Failure actions: `failure-remove-pr-labels`, `failure-remove-all-pr-labels`, `failure-add-pr-labels`, `failure-pr-message`, `close-pr`, `lock-pr`, `delete-branch`
- Outputs: `total-checks`, `failed-checks`, `passed-checks`, `result`
