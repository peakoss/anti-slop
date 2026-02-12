import type { AuthorAssociation } from "@octokit/webhooks-types";

export interface Context {
    owner: string;
    repo: string;

    repoUrl: string;
    issueUrl: string;

    number: number;

    title: string;
    body: string;

    baseBranch: string;
    headBranch: string;

    userLogin: string;
    authorAssociation: AuthorAssociation;

    labels: string[];
    milestone: string | null;

    isDraft: boolean;
    // maintainerCanModify: boolean;
    // changedFiles: number;
    // additions: number;
    // deletions: number;
}
