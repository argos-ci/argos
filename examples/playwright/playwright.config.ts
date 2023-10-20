import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  // Add Argos Playwright reporter that will send the results to Argos.
  reporter: [["list"], ["@argos-ci/playwright/reporter"]],
};

export default config;
