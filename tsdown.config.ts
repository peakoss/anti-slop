import type { UserConfig } from "tsdown";
import { defineConfig } from "tsdown";

const config: UserConfig = defineConfig({
    entry: ["./src/index.ts"],
});

export default config;
