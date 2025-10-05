import { config } from "@argos/eslint-config/base";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig(globalIgnores(["packages", "apps"]), ...config);
