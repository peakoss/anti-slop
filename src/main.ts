import * as core from "@actions/core";
import { getSettings } from "./settings.ts";

export async function run(): Promise<void> {
    try {
        const settings = getSettings();
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("An unexpected error occurred");
        }
    }
}
