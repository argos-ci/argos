const { test } = require("@playwright/test");

test("removed screenshots", async ({ page }) => {
  await page.goto("/callemall/material-ui/builds/14");
});

test("empty build", async ({ page }) => {
  await page.goto("/callemall/material-ui/builds/13");
});
