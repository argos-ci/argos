import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

test("login", async ({ page }) => {
  await page.goto("/login");
  await argosScreenshot(page, `login`);
});

test("signup", async ({ page }) => {
  await page.goto("/signup");
  await argosScreenshot(page, `signup`);
});
