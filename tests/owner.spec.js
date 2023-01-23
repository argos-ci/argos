/* eslint-disable @typescript-eslint/no-var-requires */
const { test, expect } = require("@playwright/test");
const { argosScreenshot } = require("@argos-ci/playwright");

test("repository list", async ({ page, browserName }) => {
  await page.goto("/callemall");
  await expect(page.getByText("material-ui")).toBeVisible();
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});

test("settings", async ({ page, browserName }) => {
  await page.goto("/callemall/settings");
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});
