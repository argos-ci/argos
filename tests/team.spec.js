/* eslint-disable @typescript-eslint/no-var-requires */

const { test, expect } = require("@playwright/test");
const { goto } = require("./utils");

test("private team projects", async ({ page }) => {
  await goto({ page, link: "/smooth" });
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("private team settings", async ({ page }) => {
  await goto({ page, link: "/smooth/settings" });
  await expect(page.getByText("Page not found")).toBeVisible();
});
