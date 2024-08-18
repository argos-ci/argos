import {
  configDefaults,
  defineConfig,
  mergeConfig,
  UserConfig,
} from "vitest/config";

import vitestConfig from "./vitest.config.mjs";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      exclude: [
        ...configDefaults.exclude,
        "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
    },
  }) as UserConfig,
);
