import { UserConfig, defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "./vitest.config.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      singleThread: true,
      include: ["**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
  }) as UserConfig
);
