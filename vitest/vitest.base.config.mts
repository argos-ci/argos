import { defineConfig } from "vitest/config";

/** @public */
export const EXCLUDE = [
  "./tests",
  "**/node_modules",
  "**/dist",
  "**/.claude/**",
];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Vite picks graphql's ESM build for our sources, while dependencies
    // loaded by Node (Apollo, graphql-tools, graphql-ws) get the CommonJS one.
    // Two copies reject each other's schema and errors, which production never
    // sees: it keeps dependencies external, so Node loads graphql once.
    alias: [{ find: /^graphql$/, replacement: "graphql/index.js" }],
  },
  test: {
    globalSetup: "./vitest/vitest.global-setup.mts",
    exclude: EXCLUDE,
  },
});
