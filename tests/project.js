/* eslint-disable @typescript-eslint/no-var-requires */

const { test, expect } = require("@playwright/test");
const { goto } = require("./utils");
const { argosScreenshot } = require("@argos-ci/playwright");

test("project builds", async ({ page, browserName }) => {
  await goto({ page, link: "/smooth/big" });
  await expect(page.getByText("#12")).toBeVisible();
  await argosScreenshot(page, `project-builds-${browserName}`);
});

test("project tests", async ({ page, browserName }) => {
  await goto({ page, link: "/smooth/big/tests" });
  await expect(page.getByText("penelope.jpg")).toBeVisible();
  await argosScreenshot(page, `project-tests-${browserName}`);
});

test("project hidden settings", async ({ page }) => {
  await goto({ page, link: "/smooth/big/settings" });
  await expect(page.getByText("Page not found")).toBeVisible();
});
