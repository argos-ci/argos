import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globalSetup: "./vitest/vitest.global-setup.mts",
    // "poc" holds Playwright specs driven by their own config and seed data,
    // not vitest suites.
    exclude: [
      "./tests",
      "**/node_modules",
      "**/dist",
      "**/.claude/**",
      "**/poc/**",
    ],
  },
});
