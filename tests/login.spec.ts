import { test } from "@playwright/test";

import { screenshot } from "./util";

test("login", async ({ page }) => {
  await page.goto("/login");
  await screenshot(page, "login");
});

test("signup", async ({ page }) => {
  await page.goto("/signup");
  await screenshot(page, "signup");
});
