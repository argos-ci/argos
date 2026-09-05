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
    // The frontend config is resolved with `mode: "production"` above, which
    // makes it define `process.env.NODE_ENV` as "production". React's
    // `jsx-dev-runtime` entry is a shim that switches on exactly that, and its
    // production half exports `jsxDEV` as `undefined` — while Storybook still
    // compiles stories with the dev JSX transform. Every story then dies on
    // `_jsxDEV is not a function`, so pin the test bundle to development.
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
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
              provider: playwright({
                // Pin the browser's locale and time zone rather than inheriting
                // the host's. Two reasons: any story that formats a date or a
                // number would otherwise render differently on a contributor's
                // machine and in CI, and `Intl.DateTimeFormat().resolvedOptions()
                // .timeZone` returns `Etc/Unknown` on a host ICU cannot resolve
                // — which `@internationalized/date` rejects outright, taking the
                // calendar stories down with it.
                contextOptions: { locale: "en-US", timezoneId: "UTC" },
              }) as unknown as BrowserProviderOption<object>,
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
