import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest(
  "project tests page",
  async ({ page, team, plan, project, builds }) => {
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}/tests`);
    await expect(page.getByRole("heading", { name: "Tests" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /penelope-argos\.jpg/ }),
    ).toBeVisible();
    await screenshot(page, "project-tests", {
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);

loggedTest(
  "test detail page",
  async ({ page, team, plan, project, builds }) => {
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}/tests`);
    await page.getByRole("link", { name: /penelope-argos\.jpg/ }).click();
    await expect(
      page.getByRole("heading", { name: "penelope-argos.jpg" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /Changes/ })).toBeVisible();
    await screenshot(page, "test-detail", {
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);
