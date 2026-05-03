import { expect } from "@playwright/test";

import { AutomationRule } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("automations", async ({ page, team, plan, project }) => {
  await AutomationRule.query().insert({
    active: true,
    name: "Notify visual changes",
    projectId: project.id,
    on: ["build.completed"],
    if: {
      all: [],
    },
    then: [
      {
        action: "sendSlackMessage",
        actionPayload: {
          channelId: "CARGOSVISUAL",
        },
      },
    ],
  });

  await page.goto(`/${team.account.slug}/${project.name}/automations`);
  await expect(
    page.getByRole("heading", { name: "Automations Rules" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Notify visual changes/ }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();
  await screenshot(page, "project-automations", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("new automation", async ({ page, team, plan, project }) => {
  await page.goto(`/${team.account.slug}/${project.name}/automations/new`);
  await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "New Automation Rule" }),
  ).toBeVisible();
  await expect(page.getByText("Build Completed")).toBeVisible();
  await screenshot(page, "project-automation-new", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});
