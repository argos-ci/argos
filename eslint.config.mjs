import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

const config = tseslint.config(
  {
    name: "argos/global-ignores",
    ignores: [
      "**/dist",
      "apps/backend/src/graphql/__generated__",
      "apps/frontend",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "argos/custom-ts-rules",
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
    files: ["**/*.test.?(m)js"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
);

export default config;
