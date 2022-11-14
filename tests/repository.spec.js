/* eslint-disable @typescript-eslint/no-var-requires */
const { test, expect } = require("@playwright/test");
const { goto, argosScreenshot } = require("./utils");

test("build list", async ({ page, browserName }) => {
  await goto({ page, link: "/callemall/material-ui/builds" });
  await expect(page.getByText("#12")).toBeVisible();
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});
