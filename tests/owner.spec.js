const { test } = require("@playwright/test");

test("repositories list", async ({ page }) => {
  await page.goto("/callemall");
});

test("settings", async ({ page }) => {
  await page.goto("/callemall/settings");
});
