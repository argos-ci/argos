/* eslint-disable @typescript-eslint/no-var-requires */
const { test, expect } = require("@playwright/test");
const { argosScreenshot } = require("@argos-ci/playwright");

test("build list", async ({ page, browserName }) => {
  await page.goto("/callemall/material-ui");
  await expect(page.getByText("#12")).toBeVisible();
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});
