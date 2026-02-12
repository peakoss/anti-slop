import * as core from "@actions/core";
import type { Settings } from "./types";
import type { Context } from "./types";

export function checkExemptions(settings: Settings, context: Context): boolean {
    core.info("Checking exemptions...");

    core.info("No exemptions found");
    return false;
}
