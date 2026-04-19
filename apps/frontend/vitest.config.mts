import path from "node:path";
import { fileURLToPath } from "node:url";
import { argosVitestPlugin } from "@argos-ci/storybook/vitest-plugin";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import type { UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vitest/config";
import type { BrowserProviderOption } from "vitest/node";

import frontendViteConfig from "./vite.config.mjs";

const env = globalThis.process?.env ?? {};
const dirname = path.dirname(fileURLToPath(import.meta.url));

async function resolveFrontendViteConfig(): Promise<UserConfig> {
  if (typeof frontendViteConfig === "function") {
    return (await frontendViteConfig({
      command: "serve",
      mode: "production",
      isPreview: false,
      isSsrBuild: false,
    })) as UserConfig;
  }

  return frontendViteConfig as UserConfig;
}

export default mergeConfig(
  await resolveFrontendViteConfig(),
  defineConfig({
    server: {
      host: "127.0.0.1",
    },
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "pnpm storybook --ci",
              tags: {
                exclude: ["skip-test"],
              },
            }),
            argosVitestPlugin({
              uploadToArgos: env.CI === "true",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider:
                playwright() as unknown as BrowserProviderOption<object>,
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
