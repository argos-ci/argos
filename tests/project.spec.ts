import { argosScreenshot } from "@argos-ci/playwright";
import { expect } from "@playwright/test";

import { seedTest } from "./seed-test";

seedTest("project builds", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}`);
  await expect(page.getByText("12")).toBeVisible();
  await argosScreenshot(page, `project-builds`);
});
