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
