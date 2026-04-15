import type { Config } from "eslint/config";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

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
			// Put generics on the type annotation (`const x: Map<K,V> = new Map()`), not the
			// constructor (`const x = new Map<K,V>()`). The annotation form is required by
			// isolatedDeclarations.
			"@typescript-eslint/consistent-generic-constructors": ["error", "type-annotation"],
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
