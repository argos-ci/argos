import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  // Add Argos reporter.
  reporter: [
    ["list"],
    [
      "@argos-ci/playwright/reporter",
      {
        // Enable upload to Argos only when it runs on CI.
        uploadToArgos: !!process.env.CI,
        // Set your Argos token (required only if you don't use GitHub Actions).
        token: "<YOUR-ARGOS-TOKEN>",
      },
    ],
  ],

  // Setup recording option to enable test debugging features.
  use: {
    // Setting to capture screenshot only when a test fails.
    screenshot: "only-on-failure",
    // Setting to retain traces only when a test fails.
    trace: "retain-on-failure",
  },
};

export default config;
