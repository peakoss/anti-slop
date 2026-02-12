import * as github from "@actions/github";
import * as core from "@actions/core";
import type { Context } from "./types";

export function buildContext(): Context {
    core.info("Building context from payload...");

    const payload = github.context.payload;

    core.debug(`Payload:\n${JSON.stringify(payload, null, 2)}`);

    return {};
}
