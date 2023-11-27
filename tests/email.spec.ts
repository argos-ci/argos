import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

test("email/welcome", async ({ page }) => {
  await page.goto("/email-preview/welcome");
  await argosScreenshot(page, `email/welcome`, {
    viewports: ["iphone-x", "macbook-15"],
  });
});
