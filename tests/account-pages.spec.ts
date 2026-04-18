import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("team projects page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}`);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sparkle/ })).toBeVisible();
  await screenshot(page, "account-projects", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("new project page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/new`);
  await expect(
    page.getByRole("heading", { name: "Create a new Project" }),
  ).toBeVisible();
  await screenshot(page, "account-new-project", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("account analytics page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/~/analytics`);
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(page.getByText("Screenshots by Project")).toBeVisible();
  await screenshot(page, "account-analytics", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings general page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings`);
  await expect(
    page.getByRole("heading", { name: "Team Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Team Name")).toBeVisible();
  await page.getByLabel("URL namespace").fill("acme");
  await screenshot(page, "team-settings-general", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings billing page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/billing`);
  await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
  await expect(page.getByText("Current period")).toBeVisible();
  await screenshot(page, "team-settings-billing", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings members page", async ({ page, team, auth, plan }) => {
  await page.goto(`/${team.account.slug}/settings/members`);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Default access role" }),
  ).toBeVisible();
  await screenshot(page, "team-settings-members", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
      [auth.account.slug]: "john-doe",
      ...(auth.account.name ? { [auth.account.name]: "Jonh Doe" } : {}),
    },
  });
});

loggedTest("team settings integrations page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/integrations`);
  await expect(page.getByRole("heading", { name: "Slack" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GitLab" })).toBeVisible();
  await screenshot(page, "team-settings-integrations", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});

loggedTest("team settings security page", async ({ page, team, plan }) => {
  await page.goto(`/${team.account.slug}/settings/security-and-privacy`);
  await expect(
    page.getByRole("heading", { name: "SAML Single Sign-On" }),
  ).toBeVisible();
  await screenshot(page, "team-settings-security", {
    replacements: {
      [team.account.slug]: "acme",
      [getPlanLabel(plan.name)]: "Pro",
    },
  });
});
