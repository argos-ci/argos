import { globSync, readFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.base.config.mjs";
import { E2E_WORKERS } from "./vitest.e2e.workers.mjs";

const INCLUDE = "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

/**
 * What a test file can leave behind for the next file its worker runs, when
 * workers are reused: module mocks, spies, stubbed globals, fake timers,
 * configuration and environment changes, shared clients it closes. And
 * `createApp()`, which starts the GraphQL server: Apollo throws when it is
 * started twice, and the GraphQL test helper starts it too.
 */
const LEAKING_STATE = new RegExp(
  [
    String.raw`\bvi\.(?:mock|doMock|spyOn|stubGlobal|stubEnv|useFakeTimers|setSystemTime|setConfig)\(`,
    String.raw`\bconfig\.set\(`,
    String.raw`\bprocess\.env(?:\.\w+|\[[^\]]+\])\s*=[^=]`,
    String.raw`\.(?:destroy|quit)\(\)|\bquit\w*\(`,
    String.raw`\bcreateApp\b[^;]*\bfrom\s+["'](?:\.\/app|@\/web\/app)["']`,
  ].join("|"),
);

const testFiles = globSync(INCLUDE, {
  exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**"],
});
const isolatedFiles = testFiles.filter((file) =>
  LEAKING_STATE.test(readFileSync(file, "utf8")),
);
const sharedFiles = testFiles.filter((file) => !isolatedFiles.includes(file));

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // Appended to the global setup of the base config.
      globalSetup: ["./vitest/vitest.e2e.global-setup.mts"],
      setupFiles: ["./vitest/vitest.e2e.setup.mts"],
      // Tests truncate the database between each of them, so a worker can only
      // run one file at a time, and needs a database of its own.
      maxWorkers: E2E_WORKERS,
      // Workers compete for the same CPU and Postgres server, so a test takes
      // longer than it would alone. Well above what the slowest one needs, and
      // still short enough to catch something that hangs.
      testTimeout: 15_000,
      include: [INCLUDE],
      // Importing the backend took most of the run when every file did it in a
      // fresh worker, so a worker is reused across the files that leave nothing
      // behind. A project inherits `include` and adds to it, so each one
      // excludes the other's files instead. Distinct group orders keep them
      // from interleaving: a reused worker is torn down whenever the next file
      // in the queue belongs to the isolated project.
      projects: [
        {
          extends: true,
          test: {
            name: "shared",
            isolate: false,
            exclude: isolatedFiles,
            sequence: { groupOrder: 0 },
          },
        },
        {
          extends: true,
          test: {
            name: "isolated",
            exclude: sharedFiles,
            sequence: { groupOrder: 1 },
          },
        },
      ],
    },
  }),
);
