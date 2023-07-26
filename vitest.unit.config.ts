import {
  UserConfig,
  configDefaults,
  defineConfig,
  mergeConfig,
} from "vitest/config";

import vitestConfig from "./vitest.config.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      threads: false, // not supported by sharp, see https://github.com/vitest-dev/vitest/issues/740
      exclude: [
        ...configDefaults.exclude,
        "**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      ],
    },
  }) as UserConfig
);
