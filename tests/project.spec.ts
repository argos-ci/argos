import { argosScreenshot } from "@argos-ci/playwright";
import { expect } from "@playwright/test";

import { seedTest } from "./seed-test";
import { replaceText } from "./util";

seedTest("project builds", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}`);
  await expect(page.getByText("12")).toBeVisible();
  const restore = await replaceText(page, {
    [team.account.slug]: "acme",
  });
  await argosScreenshot(page, `project-builds`);
  await restore();
});
