import * as core from "@actions/core";
import type { Settings, Context } from "./types";

export function checkExemptions(settings: Settings, context: Context): boolean {
    core.info("Checking exemptions...");
    if (settings.exemptDraftPrs && context.isDraft) {
        core.info("Draft PR detected — skipping all checks");
        return true;
    }

    if (
        settings.exemptBots.length > 0 &&
        settings.exemptBots.some((bot) => bot.toLowerCase() === context.userLogin.toLowerCase())
    ) {
        core.info(`Bot "${context.userLogin}" is exempt — skipping all checks`);
        return true;
    }

    if (
        settings.exemptUsers.length > 0 &&
        settings.exemptUsers.some((user) => user.toLowerCase() === context.userLogin.toLowerCase())
    ) {
        core.info(`User "${context.userLogin}" is exempt — skipping all checks`);
        return true;
    }

    if (
        settings.exemptAuthorAssociation.length > 0 &&
        settings.exemptAuthorAssociation.some((assoc) => assoc === context.authorAssociation)
    ) {
        core.info(
            `Author association "${context.authorAssociation}" is exempt — skipping all checks`,
        );
        return true;
    }

    const exemptLabel =
        settings.exemptPrLabel !== "" ? settings.exemptPrLabel : settings.exemptLabel;
    if (exemptLabel !== "" && context.labels.includes(exemptLabel)) {
        core.info(`PR has exempt label "${exemptLabel}" — skipping all checks`);
        return true;
    }

    const exemptAllMilestones = settings.exemptAllPrMilestones || settings.exemptAllMilestones;
    if (exemptAllMilestones && context.milestone !== null) {
        core.info(
            `PR has milestone "${context.milestone}" and all milestones are exempt — skipping all checks`,
        );
        return true;
    }

    const exemptMilestones =
        settings.exemptPrMilestones.length > 0
            ? settings.exemptPrMilestones
            : settings.exemptMilestones;
    if (
        context.milestone !== null &&
        exemptMilestones.some(
            (milestone) => milestone.toLowerCase() === context.milestone?.toLowerCase(),
        )
    ) {
        core.info(`PR milestone "${context.milestone}" is exempt — skipping all checks`);
        return true;
    }

    core.info("No exemptions found");
    return false;
}
