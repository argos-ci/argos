import { config } from "@argos/eslint-config/react";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig(
  globalIgnores(["src/graphql/__generated__"]),
  ...config,
  {
    name: "argos/vitest-assertions",
    // Two shapes assert without calling `expect` where ESLint can see it:
    // supertest's own `.expect(status)` at the end of a request chain, and the
    // `expectHttpError` helper each service test defines to assert a rejection
    // carries a given HTTP status. Both fail the test when they don't hold, so
    // name them rather than padding tests with a redundant `expect`.
    files: ["**/*.test.ts"],
    rules: {
      "vitest/expect-expect": [
        "error",
        {
          assertFunctionNames: [
            "expect",
            "expectHttpError",
            "request.**.expect",
          ],
        },
      ],
    },
  },
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
