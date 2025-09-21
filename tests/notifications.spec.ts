import fs from "node:fs";
import path from "node:path";
import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

const notificationsDir = path.resolve(
  __dirname,
  "../apps/backend/src/notification/handlers",
);
const notificationFiles = fs
  .readdirSync(notificationsDir)
  .filter((file) => file.endsWith(".tsx"));

notificationFiles.forEach((file) => {
  const type = path.basename(file, ".tsx");
  test(`notification ${type}`, async ({ page }) => {
    await page.goto(`/notification-preview/${type}`);
    await argosScreenshot(page, `notification/${type}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
