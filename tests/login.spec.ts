import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

test("login", async ({ page, browserName }) => {
  await page.goto("/login");
  await argosScreenshot(page, `login-${browserName}`);
});

test("signup", async ({ page, browserName }) => {
  await page.goto("/signup");
  await argosScreenshot(page, `signup-${browserName}`);
});
