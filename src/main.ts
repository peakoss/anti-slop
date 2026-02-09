import * as core from "@actions/core";

export async function run(): Promise<void> {
    try {
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("An unexpected error occurred");
        }
    }
}
