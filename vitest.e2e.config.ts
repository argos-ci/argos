import { defineConfig, mergeConfig, UserConfig } from "vitest/config";

import vitestConfig from "./vitest.config.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
      include: ["**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  }) as UserConfig,
);
