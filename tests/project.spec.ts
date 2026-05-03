import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest(
  "project builds",
  async ({ page, auth, team, plan, project, builds }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}`);
    await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Builds" })).toBeVisible();
    await screenshot(page, "project-builds", {
      replacements: {
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);

loggedTest("project settings", async ({ page, team, plan, auth, project }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/${project.name}/settings`);
  await expect(
    page.getByRole("heading", { name: "Project Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Upload token")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();
  await screenshot(page, "project-settings", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
      [project.token]: "arp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      [auth.account.slug]: "john-doe",
      ...(auth.account.name ? { [auth.account.name]: "John Doe" } : {}),
    },
  });
});
