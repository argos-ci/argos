import { globSync, readFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig, { EXCLUDE } from "./vitest.base.config.mjs";
import { E2E_WORKERS } from "./vitest.e2e.workers.mjs";

const INCLUDE = "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

/**
 * What a test file can leave behind for the next file its worker runs: mocked
 * modules (and code `vi.hoisted` runs before the imports), configuration and
 * environment changes, shared clients it destroys. Vitest restores spies after
 * each file, and `vitest.e2e.setup.mts` restores timers and stubs.
 */
const LEAKING_STATE = new RegExp(
  [
    String.raw`\bvi\.(?:mock|doMock|hoisted)\(`,
    String.raw`\bconfig\.set\(`,
    String.raw`\bprocess\.env(?:\.\w+|\[[^\]]+\])\s*=[^=]`,
    String.raw`\.destroy\(\)`,
  ].join("|"),
);

const isolatedFiles = globSync(INCLUDE, { exclude: EXCLUDE }).filter((file) =>
  LEAKING_STATE.test(readFileSync(file, "utf8")),
);

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
      // Importing the backend took most of the run when every file did it in a
      // fresh worker, so workers are reused across the files that leave
      // nothing behind.
      projects: [
        {
          test: {
            name: "shared",
            isolate: false,
            include: [INCLUDE],
            exclude: isolatedFiles,
          },
        },
        { test: { name: "isolated", include: isolatedFiles } },
      ],
    },
  }),
);
