import { config } from "@argos/eslint-config/react";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig(
  globalIgnores(["src/graphql/__generated__"]),
  ...config,
  {
    name: "argos/no-file-relative-paths",
    // This code is bundled, so a module does not keep its own file in the
    // output: `src/config/index.ts` may land at `dist/config/index.js` or be
    // inlined into `dist/chunks/config-a1b2c3.js`. Counting `../` from the
    // running file then resolves somewhere else entirely, and it fails at
    // runtime rather than at build time — which is exactly how the frontend
    // `dist` lookup in `web/app-router.ts` slipped through review.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/util/paths.ts", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][property.name=/^(dirname|filename|url)$/]",
          message:
            "Do not derive paths from a module's own location — it does not survive bundling. Use resolveFromPackageRoot or resolveFromRepositoryRoot from @/util/paths.",
        },
        {
          selector: "Identifier[name=/^__(dirname|filename)$/]",
          message:
            "Do not derive paths from a module's own location — it does not survive bundling. Use resolveFromPackageRoot or resolveFromRepositoryRoot from @/util/paths.",
        },
      ],
    },
  },
);
