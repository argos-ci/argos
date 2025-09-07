import fs from "node:fs";
import path from "node:path";
import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

const templatesDir = path.resolve(
  __dirname,
  "../apps/backend/src/email/templates",
);
const templateFiles = fs
  .readdirSync(templatesDir)
  .filter((file) => file.endsWith(".tsx"));

templateFiles.forEach((file) => {
  if (file === "index.ts") {
    return;
  }
  const type = path.basename(file, ".tsx");
  test(`email ${type}`, async ({ page }) => {
    await page.goto(`/email-preview/${type}`);
    await argosScreenshot(page, `email/${type}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
