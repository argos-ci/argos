import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.base.config.mjs";
import { E2E_WORKERS } from "./vitest.e2e.workers.mjs";

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
      include: ["**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  }),
);
