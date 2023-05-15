/* eslint-disable @typescript-eslint/no-var-requires */

const { test } = require("@playwright/test");
const { goto } = require("./utils");
const { argosScreenshot } = require("@argos-ci/playwright");

test("repository list", async ({ page, browserName }) => {
  await goto({ page, link: "/signup" });
  await argosScreenshot(page, `signup-${browserName}`);
});
