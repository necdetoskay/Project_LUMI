import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/.next-e2e/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/tests/**/*", "**/*.spec.ts", "**/*.test.ts", "**/e2e/**/*"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: [
      "apps/web/scripts/lumi-demo-*.mjs",
      "apps/web/scripts/backfill-character-sheet-derivatives.mjs",
      "scripts/backfill-character-sheet-derivatives.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },
];
