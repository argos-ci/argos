const { test } = require("@playwright/test");

test("not connected", async ({ page }) => {
  await page.goto("/");
});
