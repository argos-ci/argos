import { argosScreenshot } from "@argos-ci/playwright";
import { expect, test } from "@playwright/test";

test("project builds", async ({ page }) => {
  await page.goto("/smooth/big");
  await expect(page.getByText("12")).toBeVisible();
  await argosScreenshot(page, `project-builds`);
});

test("project automations", async ({ page }) => {
  await page.goto("/smooth/big/automations");
  await argosScreenshot(page, `project-automations`);
  await page.goto("/smooth/big/automations/new");
  await argosScreenshot(page, `project-automations-new`);
});

test.skip("project tests", async ({ page }) => {
  await page.goto("/smooth/big/tests");
  await expect(page.getByText("penelope.jpg")).toBeVisible();
  await argosScreenshot(page, `project-tests`);
});

test("project hidden settings", async ({ page }) => {
  await page.goto("/smooth/big/settings");
  await expect(page.getByText("Page not found")).toBeVisible();
});
