import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest("account projects", async ({ page, team, plan, project, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}`);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: project.name })).toBeVisible();
  await screenshot(page, "account-projects", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("new project", async ({ page, team, plan, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/new`);
  await expect(
    page.getByRole("heading", { name: "Create a new Project" }),
  ).toBeVisible();
  await screenshot(page, "account-new-project", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("account analytics", async ({ page, team, plan, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/~/analytics`);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Screenshots by Project")).toBeVisible();
  await screenshot(page, "account-analytics", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});
