import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest("account projects", async ({ page, team, project, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}`);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Visit ${project.name}` }),
  ).toBeVisible();
  await screenshot(page, "account-projects");
});

loggedTest("new project", async ({ page, team, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/new`);
  await expect(
    page.getByRole("heading", { name: "Create a new Project" }),
  ).toBeVisible();
  await screenshot(page, "account-new-project");
});

loggedTest("account analytics", async ({ page, team, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/~/analytics`);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Screenshots by Project")).toBeVisible();
  await screenshot(page, "account-analytics");
});
