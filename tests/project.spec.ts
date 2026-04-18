import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, takeLoggedScreenshot } from "./util";

loggedTest(
  "project builds",
  async ({ page, auth, team, plan, project, builds }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    void builds;
    await page.goto(`/${team.account.slug}/${project.name}`);
    await expect(page.getByRole("heading", { name: "Builds" })).toBeVisible();
    await expect(page.getByText("12")).toBeVisible();
    await takeLoggedScreenshot({
      page,
      name: "project-builds",
      replacements: {
        [team.account.slug]: "acme",
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);
