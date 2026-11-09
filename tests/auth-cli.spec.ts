import { expect, test } from "@playwright/test";

import { screenshot } from "./util";

test("a CLI on the retired login flow is told to update", async ({ page }) => {
  await page.goto("/auth/cli?port=4242&state=a-state&pkce=a-challenge");
  await expect(
    page.getByRole("heading", { name: "Update the Argos CLI" }),
  ).toBeVisible();
  await expect(
    page.getByText("npm install --save-dev @argos-ci/cli@latest"),
  ).toBeVisible();
  await screenshot(page, "auth-cli");
});

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
