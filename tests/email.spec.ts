import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

test("email/welcome", async ({ page }) => {
  await page.goto("/email-preview/welcome");
  await argosScreenshot(page, `email/welcome`, {
    viewports: ["iphone-x", "macbook-15"],
  });
});
