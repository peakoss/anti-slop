import { type Config } from "prettier";

const config: Config = {
    printWidth: 100,
    useTabs: false,
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
    importOrderTypeScriptVersion: "5.0.0",
    importOrder: [
        "<TYPES>^(node:)",
        "<TYPES>",
        "<TYPES>^[.]",
        "<BUILTIN_MODULES>",
        "<THIRD_PARTY_MODULES>",
        "^#.+",
        "^[.]",
    ],
};

export default config;
