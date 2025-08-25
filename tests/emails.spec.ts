import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

import { emailTemplates } from "../apps/backend/src/email/templates";

emailTemplates.forEach((handler) => {
  test(`email ${handler.type}`, async ({ page }) => {
    await page.goto(`/email-preview/${handler.type}`);
    await argosScreenshot(page, `email/${handler.type}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
