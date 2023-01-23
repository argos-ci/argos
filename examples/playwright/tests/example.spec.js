import { test } from "@playwright/test";

import { argosScreenshot } from "@argos-ci/playwright";

// Welcome to Playwright + Argos!

// In this example, we use the `cy.argosSnapshot` command
// introduced by @argos/playwright package to capture a screenshots.

// When this test is executed, a new screenshot will be created
// for each configured browser.

// The screenshots are stored into the "screenshots" folder.

const screenshotsFolder = "screenshots";

test.describe("playwright.dev", () => {
  const url = "https://playwright.dev/";

  test("take screenshot", async ({ page, browserName }) => {
    await page.goto(url);
    await argosScreenshot(page, `playwright.dev-${browserName}`);
  });
});
