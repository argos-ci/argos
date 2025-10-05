import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/**
 * A custom ESLint configuration for all libraries and applications in the monorepo.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  globalIgnores(["**/node_modules", "**/dist", "**/.turbo"]),
  {
    name: "argos/global",
    rules: {
      curly: "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    name: "argos/vitest",
    files: ["**/*.test.?(m)ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "no-empty-pattern": "off",
    },
  },
]);
