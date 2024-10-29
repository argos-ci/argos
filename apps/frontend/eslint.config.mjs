import eslint from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import tailwind from "eslint-plugin-tailwindcss";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    name: "argos/ignores",
    ignores: ["**/dist", "postcss.config.js", "tailwind.config.js"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "argos/custom-ts-rules",
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  ...tailwind.configs["flat/recommended"],
  {
    name: "argos/tailwind-settings",
    rules: {
      // We use Prettier for formatting
      "tailwindcss/classnames-order": "off",
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
