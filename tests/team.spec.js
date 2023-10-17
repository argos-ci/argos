import { expect, test } from "@playwright/test";

test("private team projects", async ({ page }) => {
  await page.goto("/smooth");
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("private team settings", async ({ page }) => {
  await page.goto("/smooth/settings");
  await expect(page.getByText("Page not found")).toBeVisible();
});
