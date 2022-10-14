const { test } = require("@playwright/test");

test("repository list", async ({ page }) => {
  await page.goto("/callemall/material-ui/builds");
});
