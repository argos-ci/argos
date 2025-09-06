import eslint from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const config = tseslint.config(
  {
    name: "argos/ignores",
    ignores: ["**/dist", "src/gql/**/*"],
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
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  {
    name: "argos/react-hooks",
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  {
    name: "argos/react-rules",
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
    },
  },
);

export default config;
