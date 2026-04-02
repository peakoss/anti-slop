import { type Config } from "prettier";

const config: Config = {
    printWidth: 100, // Matches Rust default and looks the best
    useTabs: true, // Preferred for accessibility (screen readers, variable fonts) and tab width is easily adjustable per user
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
