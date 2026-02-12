import { Input } from "./enums/input.ts";
import type { Settings } from "./types";
import * as core from "@actions/core";

function parseList(raw: string): string[] {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export function getSettings(): Settings {
    const settings = {
        // Repo Auth Token
        githubToken: core.getInput(Input.GithubToken, { required: true }),
    };

    core.setSecret(settings.githubToken);

    validateSettings(settings);

    core.debug(`Settings:\n${JSON.stringify(settings, null, 2)}`);

    return settings;
}

function validateNumber(value: number, name: string, min: number, max: number): void {
    if (isNaN(value)) {
        throw new Error(`"${name}" must be a valid number`);
    }
    if (value < min || value > max) {
        throw new Error(`"${name}" must be between ${min} and ${max}, got ${value}`);
    }
}

function validateSettings(settings: Settings): void {}
