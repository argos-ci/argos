import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

// Read more about streamline page screenshot captures
// https://argos-ci.com/docs/screenshot-pages-script#playwright

test("screenshot homepage", async ({ page }, workerInfo) => {
  const url = "https://playwright.dev/";
  await page.goto(url);

  const browserName = workerInfo.project.name;
  await argosScreenshot(page, `homepage-${browserName}`);
});
