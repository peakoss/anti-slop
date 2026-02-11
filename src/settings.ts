import { Input } from "./enums/input.ts";
import type { Settings } from "./types/index.ts";
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
        githubToken: core.getInput(Input.GithubToken),
    };

    core.setSecret(settings.githubToken);

    validateSettings(settings);

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
