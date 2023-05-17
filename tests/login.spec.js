/* eslint-disable @typescript-eslint/no-var-requires */

const { test } = require("@playwright/test");
const { goto } = require("./utils");
const { argosScreenshot } = require("@argos-ci/playwright");

test("login", async ({ page, browserName }) => {
  await goto({ page, link: "/login" });
  await argosScreenshot(page, `login-${browserName}`);
});

test("signup", async ({ page, browserName }) => {
  await goto({ page, link: "/signup" });
  await argosScreenshot(page, `signup-${browserName}`);
});
