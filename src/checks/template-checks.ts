import * as core from "@actions/core";
import type { CheckResult, Context, Settings, Octokit, TemplateSection } from "../types";
import { recordCheck } from "../report.ts";

/**
 * @see https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository#adding-a-pull-request-template
 */
const PR_TEMPLATE_PATHS = [
    ".github/pull_request_template.md",
    "docs/pull_request_template.md",
    "pull_request_template.md",
    ".github/PULL_REQUEST_TEMPLATE/pull_request_template.md",
    "docs/PULL_REQUEST_TEMPLATE/pull_request_template.md",
    "PULL_REQUEST_TEMPLATE/pull_request_template.md",
];

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;

const CHECKBOX_REGEX = /^\s*(?:>\s*)*-\s+\[([ xX])\]\s+(.+)$/gm;

export async function runTemplateChecks(
    settings: Settings,
    context: Context,
    client: Octokit,
): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    if (!settings.requirePrTemplate) {
        return results;
    }

    const template = await fetchPrTemplate(client, context.owner, context.repo);

    if (template === null) {
        core.info(
            "[SKIP] require-pr-template — No repository PR template found so this check is not applicable",
        );
        return results;
    }

    if (context.body.trim() === template.trim()) {
        recordCheck(results, {
            name: "pr-template",
            passed: false,
            message: "PR description is identical to the template (not filled in)",
        });
        return results;
    }

    const templateSections = parseSections(template);
    const bodySections = parseSections(context.body);
    const { templateIssues, strictIssues } = validateTemplateSections(
        templateSections,
        bodySections,
        settings.strictPrTemplateSections,
        settings.optionalPrTemplateSections,
    );

    core.debug(`Template section issues: ${JSON.stringify(templateIssues)}`);
    core.debug(`Strict section issues: ${JSON.stringify(strictIssues)}`);

    const passed = templateIssues.length === 0;
    recordCheck(results, {
        name: "pr-template",
        passed,
        message: passed
            ? "PR description follows the PR template structure"
            : templateIssues.join("; "),
    });

    if (settings.strictPrTemplateSections.length > 0) {
        const passed = strictIssues.length === 0;
        recordCheck(results, {
            name: "strict-pr-template-sections",
            passed,
            message: passed ? "All strict PR template sections are valid" : strictIssues.join("; "),
        });
    }

    if (settings.maxAdditionalPrTemplateSections > 0) {
        const additionalCount = bodySections.filter(
            (bodySection) =>
                !templateSections.some(
                    (templateSection) =>
                        templateSection.heading.toLowerCase() === bodySection.heading.toLowerCase(),
                ),
        ).length;
        const passed = additionalCount <= settings.maxAdditionalPrTemplateSections;
        recordCheck(results, {
            name: "max-additional-pr-template-sections",
            passed,
            message: passed
                ? `PR has ${String(additionalCount)} additional section(s), within maximum of ${String(settings.maxAdditionalPrTemplateSections)}`
                : `PR has ${String(additionalCount)} additional section(s), exceeds maximum of ${String(settings.maxAdditionalPrTemplateSections)}`,
        });
    }

    return results;
}

function parseSections(text: string): TemplateSection[] {
    HEADING_REGEX.lastIndex = 0;
    const matches: { fullLine: string; text: string; position: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = HEADING_REGEX.exec(text)) !== null) {
        const headingText = match[2];
        if (headingText !== undefined) {
            matches.push({
                fullLine: match[0],
                text: headingText.trim(),
                position: match.index,
            });
        }
    }

    return matches.map((current, index) => {
        const contentStart = current.position + current.fullLine.length;
        const nextMatch = matches[index + 1];
        const contentEnd = nextMatch !== undefined ? nextMatch.position : text.length;
        return {
            heading: current.fullLine,
            headingText: current.text,
            content: text.slice(contentStart, contentEnd).trim(),
        };
    });
}

function extractCheckboxes(content: string): { text: string; checked: boolean }[] {
    CHECKBOX_REGEX.lastIndex = 0;
    const checkboxes: { text: string; checked: boolean }[] = [];

    let match: RegExpExecArray | null;
    while ((match = CHECKBOX_REGEX.exec(content)) !== null) {
        const label = match[2];
        if (label !== undefined) {
            checkboxes.push({ text: label.trim(), checked: match[1] !== " " });
        }
    }

    return checkboxes;
}

function validateTemplateSections(
    templateSections: TemplateSection[],
    bodySections: TemplateSection[],
    strictSectionNames: string[],
    optionalSectionNames: string[],
): { templateIssues: string[]; strictIssues: string[] } {
    const templateIssues: string[] = [];
    const strictIssues: string[] = [];
    const missingSections: string[] = [];

    const isStrict = (name: string): boolean =>
        strictSectionNames.some((strict) => strict.toLowerCase() === name.toLowerCase());

    const isOptional = (name: string): boolean =>
        optionalSectionNames.some((optional) => optional.toLowerCase() === name.toLowerCase());

    for (const templateSection of templateSections) {
        if (isOptional(templateSection.headingText)) continue;

        const bodySection = bodySections.find(
            (section) => section.heading.toLowerCase() === templateSection.heading.toLowerCase(),
        );

        if (!bodySection) {
            missingSections.push(templateSection.headingText);
            if (isStrict(templateSection.headingText)) {
                strictIssues.push(
                    `Strict section "${templateSection.headingText}" is missing from the PR description`,
                );
            }
            continue;
        }

        const templateCheckboxes = extractCheckboxes(templateSection.content);
        const bodyCheckboxes = extractCheckboxes(bodySection.content);

        if (isStrict(templateSection.headingText)) {
            for (const templateCheckbox of templateCheckboxes) {
                const matchingCheckbox = bodyCheckboxes.find(
                    (bodyCheckbox) =>
                        bodyCheckbox.text.toLowerCase() === templateCheckbox.text.toLowerCase(),
                );
                if (!matchingCheckbox) {
                    strictIssues.push(
                        `Strict section "${templateSection.headingText}" is missing checkbox: "${templateCheckbox.text}"`,
                    );
                } else if (!matchingCheckbox.checked) {
                    strictIssues.push(
                        `Strict section "${templateSection.headingText}" has unchecked checkbox: "${templateCheckbox.text}"`,
                    );
                }
            }
        } else if (templateCheckboxes.length > 1) {
            const matchingCheckboxes = bodyCheckboxes.filter((bodyCheckbox) =>
                templateCheckboxes.some(
                    (templateCheckbox) =>
                        templateCheckbox.text.toLowerCase() === bodyCheckbox.text.toLowerCase(),
                ),
            );
            const checkedCount = matchingCheckboxes.filter((checkbox) => checkbox.checked).length;

            if (matchingCheckboxes.length === 0) {
                templateIssues.push(
                    `Section "${templateSection.headingText}" is missing all template checkboxes`,
                );
            } else if (checkedCount === 0) {
                templateIssues.push(
                    `Section "${templateSection.headingText}" has ${String(matchingCheckboxes.length)} checkbox(es) but none are checked`,
                );
            } else if (checkedCount > 1) {
                templateIssues.push(
                    `Section "${templateSection.headingText}" has ${String(checkedCount)} checkbox(es) checked, exceeds maximum of 1`,
                );
            }
        }
    }

    if (missingSections.length > 0) {
        templateIssues.unshift(`Missing section(s): "${missingSections.join('", "')}"`);
    }

    return { templateIssues, strictIssues };
}

async function fetchPrTemplate(
    client: Octokit,
    owner: string,
    repo: string,
): Promise<string | null> {
    for (const path of PR_TEMPLATE_PATHS) {
        try {
            const { data } = await client.rest.repos.getContent({ owner, repo, path });
            if ("content" in data && typeof data.content === "string") {
                return Buffer.from(data.content, "base64").toString("utf-8");
            }
        } catch {
            continue;
        }
    }
    return null;
}
