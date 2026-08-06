import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `graphql` ships no `exports` map, so Node falls back to `main` (CJS)
      // while Vite prefers `module` (ESM). Test code goes through Vite but
      // externalized dependencies — graphql-yoga, @graphql-tools/executor — are
      // loaded by Node, so the two ended up with distinct `GraphQLError`
      // classes: `instanceof` failed across the boundary and Yoga masked the
      // errors our resolvers throw on purpose. Pin Vite to the entry Node
      // resolves, which is the single instance production runs with.
      graphql: require.resolve("graphql"),
    },
  },
  test: {
    globalSetup: "./vitest/vitest.global-setup.mts",
    exclude: ["./tests", "**/node_modules", "**/dist", "**/.claude/**"],
  },
});
