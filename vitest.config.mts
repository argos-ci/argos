import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest/vitest.base.config.mjs";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      maxWorkers: 1,
      fileParallelism: false,
    },
  }),
);
