import path from "node:path";
import { fileURLToPath } from "node:url";
import { argosVitestPlugin } from "@argos-ci/storybook/vitest-plugin";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import frontendViteConfig from "./vite.config.mts";

const env = globalThis.process?.env ?? {};
const dirname = path.dirname(fileURLToPath(import.meta.url));

async function resolveFrontendViteConfig() {
  if (typeof frontendViteConfig === "function") {
    return frontendViteConfig({
      command: "serve",
      mode: "development",
      isPreview: false,
      isSsrBuild: false,
    });
  }

  return frontendViteConfig;
}

export default mergeConfig(
  await resolveFrontendViteConfig(),
  defineConfig({
    server: {
      host: "127.0.0.1",
      https: false,
    },
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "pnpm storybook --ci",
            }),
            argosVitestPlugin({
              uploadToArgos: env.CI === "true",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              api: {
                host: "127.0.0.1",
              },
              provider: playwright(),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  }),
);
