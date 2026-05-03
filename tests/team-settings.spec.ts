import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("team settings - general", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings`);
  await expect(
    page.getByRole("heading", { name: "Team Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Team Name")).toBeVisible();
  await page.getByLabel("URL namespace").fill("acme");
  await screenshot(page, "team-settings-general", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings - billing", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/billing`);
  await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
  await expect(page.getByText("Current period")).toBeVisible();
  await screenshot(page, "team-settings-billing", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings - members", async ({ page, team, auth, plan }) => {
  await page.goto(`/${team.account.slug}/settings/members`);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Default access role" }),
  ).toBeVisible();
  if (!auth.account.name) {
    throw new Error("Account name not found");
  }
  await expect(page.getByText(auth.account.name)).toBeVisible();
  await screenshot(page, "team-settings-members", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
      [auth.account.slug]: "john-doe",
      [auth.account.name]: "John Doe",
    },
  });
});

loggedTest("team settings - integrations", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/integrations`);
  await expect(page.getByRole("heading", { name: "Slack" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GitLab" })).toBeVisible();
  await screenshot(page, "team-settings-integrations", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings - security", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/security-and-privacy`);
  await expect(
    page.getByRole("heading", { name: "SAML Single Sign-On" }),
  ).toBeVisible();
  await screenshot(page, "team-settings-security", {
    replacements: {
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});
