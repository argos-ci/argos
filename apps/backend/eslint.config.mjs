import { config } from "@argos/eslint-config/react";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig(
  globalIgnores(["src/graphql/__generated__"]),
  ...config,
);
