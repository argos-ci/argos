import { expect } from "@playwright/test";

import { createAnalyticsScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest("account projects", async ({ page, team, project, auth }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}`);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Visit ${project.name}` }),
  ).toBeVisible();
  await expect(page.getByText("Not deployed")).toBeVisible();
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

loggedTest(
  "account analytics with Storybook screenshots",
  async ({ page, team, project, auth }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    // 100 Storybook screenshots out of 400 over three fixed days.
    const { period } = await createAnalyticsScenario({ projectId: project.id });

    // The window the seed was written for. Read through a relative period, the
    // chart labels its axis with today's calendar and the baseline is stale
    // tomorrow.
    await page.goto(
      `/${team.account.slug}/~/analytics?period=custom&from=${period.from}&to=${period.to}`,
    );
    await expect(page.getByText("25% Storybook")).toBeVisible();
    await screenshot(page, "account-analytics-storybook");
  },
);
