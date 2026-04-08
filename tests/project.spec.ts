import { argosScreenshot } from "@argos-ci/playwright";
import { expect } from "@playwright/test";

import { test } from "./seed-test";

test("project builds", async ({ page, seedProject, seedBuilds }) => {
  void seedBuilds;
  await page.goto(`/${seedProject.accountSlug}/${seedProject.projectName}`);
  await expect(page.getByText("12")).toBeVisible();
  await argosScreenshot(page, `project-builds`);
});

test.skip("project tests", async ({ page, seedProject, seedBuilds }) => {
  void seedBuilds;
  await page.goto(
    `/${seedProject.accountSlug}/${seedProject.projectName}/tests`,
  );
  await expect(page.getByText("penelope.jpg")).toBeVisible();
  await argosScreenshot(page, `project-tests`);
});

test("project hidden settings", async ({ page, seedProject }) => {
  await page.goto(
    `/${seedProject.accountSlug}/${seedProject.projectName}/settings`,
  );
  await expect(page.getByText("Page not found")).toBeVisible();
});
