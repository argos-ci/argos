import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

import { notificationHandlers } from "../apps/backend/src/notification/handlers/index.js";

notificationHandlers.forEach((handler) => {
  test(`notification ${handler.type}`, async ({ page }) => {
    await page.goto(`/notification-preview/${handler.type}`);
    await argosScreenshot(page, `notification/${handler.type}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
