import { type Config, defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

const config: Config[] = defineConfig(
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    prettier,
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: "error",
            reportUnusedInlineConfigs: "error",
        },
        rules: {
            "@typescript-eslint/consistent-generic-constructors": ["error", "type-annotation"], // Override default "constructor" to "type-annotation" to make it compatible with isolatedDeclarations.
        },
        languageOptions: {
            globals: { ...globals.node },
            parserOptions: {
                projectService: true,
                ecmaFeatures: {
                    impliedStrict: true,
                },
            },
        },
    },
);

export default config;
