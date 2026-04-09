import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.base.config.mjs";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      maxWorkers: 1,
      fileParallelism: false,
      include: ["**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  }),
);
