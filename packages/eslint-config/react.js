import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for all libraries using React in the monorepo.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = defineConfig(...baseConfig, {
  name: "argos/react",
  files: ["**/*.?(m){jsx,tsx}"],
  ...reactHooks.configs.flat.recommended,
});
