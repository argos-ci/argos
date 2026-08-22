import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { getCSPScriptHash } from "@argos-ci/playwright";
import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";
import { defineConfig, devices } from "@playwright/test";

/**
 * Number of workers.
 */
const WORKERS = 2;

const backendDir = fileURLToPath(new URL("./apps/backend", import.meta.url));
const backendManifest = createRequire(import.meta.url)(
  "./apps/backend/package.json",
) as { scripts: Record<string, string> };

/**
 * The command that starts the web process, taken from the package script so the
 * `--import ./dist/instrument.js` flag stays defined in one place.
 *
 * Read rather than delegated to `pnpm run`: this config is executed inside the
 * Playwright container, which ships npm only.
 */
const startWebCommand = backendManifest.scripts["start-web"];
if (!startWebCommand) {
  throw new Error('apps/backend/package.json has no "start-web" script');
}

/**
 * @see https://playwright.dev/docs/test-configuration
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
const config = defineConfig({
  testDir: "./tests",
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: WORKERS,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["list"],
    ["html"],
    [
      "@argos-ci/playwright/reporter",
      createArgosReporterOptions({
        uploadToArgos: !!process.env.CI,
      }),
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    /* Capture screenshot after each test */
    screenshot: "only-on-failure",
    // Stabilize text rendering so screenshots match across macOS and CI.
    launchOptions: {
      args: ["--disable-lcd-text", "--font-render-hinting=none"],
    },
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
      dependencies: ["setup"],
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: "screenshots",

  /* Run your local dev server before starting the tests */
  webServer: {
    command: startWebCommand,
    cwd: backendDir,
    port: 3000,
    timeout: 10 * 1000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "test",
      CSP_SCRIPT_SRC: `${getCSPScriptHash()},'unsafe-eval'`,
      // The staff revenue band reads Stripe's invoices at request time. Left to
      // the key in `.env`, the suite would call Stripe on every run of the
      // staff page — a third party in the way of the tests, and a figure that
      // changes under the visual baseline. Unset, the band reports itself
      // unavailable, which is both true here and stable.
      STRIPE_API_KEY: "no-api-key",
    },
  },
});

export default config;
