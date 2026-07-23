import { expect, test } from "@playwright/test";

import { screenshot } from "./util";

test("auth cli success", async ({ page }) => {
  await page.goto("/auth/cli/success");
  await expect(
    page.getByRole("heading", { name: "Authorization successful" }),
  ).toBeVisible();
  await expect(
    page.getByText("npx skills add https://argos-ci.com"),
  ).toBeVisible();
  await screenshot(page, "auth-cli-success");
});
