import type { CheckResult, Context, Settings } from "../types";
import { recordCheck } from "../report.ts";

/**
 * @see https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls#issues-and-pull-requests
 */
const ISSUE_REF_PATTERNS = [
    /https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/gi, // matches full issue URLs
    /(?:[\w.-]+\/[\w.-]+)#(\d+)/g, // matches owner/repo#123
    /GH-(\d+)/gi, // matches GH-123
    /(?:^|[\s(])#(\d+)/gm, // matches #123
];

export function runDescriptionChecks(settings: Settings, context: Context): CheckResult[] {
    const results: CheckResult[] = [];

    const body = context.body;

    if (settings.requireDescription) {
        const empty = body.replace(/\s/g, "").length === 0;
        const passed = !empty;
        recordCheck(results, {
            name: "description-empty",
            passed,
            message: passed ? "PR description is present" : "PR description is empty",
        });
    }

    if (settings.maxDescriptionLength > 0) {
        const over = body.length > settings.maxDescriptionLength;
        const passed = !over;
        recordCheck(results, {
            name: "description-max-length",
            passed,
            message: passed
                ? `Description is ${String(body.length)} chars, within maximum of ${String(settings.maxDescriptionLength)}`
                : `Description is ${String(body.length)} chars, exceeds maximum of ${String(settings.maxDescriptionLength)}`,
        });
    }

    if (settings.maxEmojiCount > 0) {
        const text = `${context.title} ${body}`;
        const count = text.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
        const passed = count <= settings.maxEmojiCount;
        recordCheck(results, {
            name: "emoji-count",
            passed,
            message: passed
                ? `Found ${String(count)} emoji(s), within maximum of ${String(settings.maxEmojiCount)}`
                : `Found ${String(count)} emoji(s), exceeds maximum of ${String(settings.maxEmojiCount)}`,
        });
    }

    if (settings.blockedTerms.length > 0) {
        const visibleBody = body.replace(/<!--[\s\S]*?-->/g, "");
        const found = settings.blockedTerms.filter((term) => visibleBody.includes(term));
        const passed = found.length === 0;
        recordCheck(results, {
            name: "blocked-terms",
            passed,
            message: passed
                ? "No blocked terms found in the description"
                : `Found ${String(found.length)} blocked term(s) in the description: "${found.join('", "')}"`,
        });
    }

    const issueNumbers = extractIssueNumbers(body);

    if (settings.requireLinkedIssue) {
        const passed = issueNumbers.length > 0;
        recordCheck(results, {
            name: "linked-issue",
            passed,
            message: passed
                ? `Found ${String(issueNumbers.length)} linked issue(s) in the PR description`
                : "No linked issues found in the PR description",
        });
    }

    if (settings.blockedIssueNumbers.length > 0) {
        const blockedNumbers = settings.blockedIssueNumbers.map((raw) => parseInt(raw));
        const found = issueNumbers.filter((issueNumber) => blockedNumbers.includes(issueNumber));
        const passed = found.length === 0;
        recordCheck(results, {
            name: "blocked-issue-numbers",
            passed,
            message: passed
                ? "No blocked issue numbers found in the description"
                : `Found ${String(found.length)} blocked issue number(s) in the description: "${found.join(", ")}"`,
        });
    }

    return results;
}

function extractIssueNumbers(text: string): number[] {
    const numbers = new Set<number>();
    for (const pattern of ISSUE_REF_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
            const num = match[1];
            if (num !== undefined) numbers.add(parseInt(num));
        }
    }
    return [...numbers];
}
