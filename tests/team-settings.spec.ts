import { expect } from "@playwright/test";

import { TeamUser } from "../apps/backend/src/database/models";
import { createUserAccount } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getUniqueTestIdentifier, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("team settings - general", async ({ page, team }) => {
  await page.goto(`/${team.account.slug}/settings`);
  await expect(
    page.getByRole("heading", { name: "Team Settings" }),
  ).toBeVisible();
  await expect(page.getByText("Team Name")).toBeVisible();
  await page.getByLabel("URL namespace").fill("acme");
  await screenshot(page, "team-settings-general");
});

loggedTest("team settings - billing", async ({ page, team }) => {
  await page.goto(`/${team.account.slug}/settings/billing`);
  await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
  await expect(page.getByText("Current period")).toBeVisible();
  await screenshot(page, "team-settings-billing");
});

loggedTest("team settings - members", async ({ page, team, auth }) => {
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
      [auth.account.slug]: "john-doe",
      [auth.account.name]: "John Doe",
    },
  });
});

loggedTest("team settings - integrations", async ({ page, team }) => {
  await page.goto(`/${team.account.slug}/settings/integrations`);
  await expect(page.getByRole("heading", { name: "Slack" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "GitLab" })).toBeVisible();
  await screenshot(page, "team-settings-integrations");
});

loggedTest("team settings - authentication", async ({ page, team }) => {
  await page.goto(`/${team.account.slug}/settings/authentication`);
  await expect(
    page.getByRole("heading", { name: "Team domains" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "SAML Single Sign-On" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading").filter({
      hasText: /^(Team domains|GitHub Single Sign-On|SAML Single Sign-On)$/,
    }),
  ).toHaveText([
    "Team domains",
    "GitHub Single Sign-On",
    "SAML Single Sign-On",
  ]);
  await screenshot(page, "team-settings-authentication");
});

loggedTest(
  "team settings - remove a member from the team",
  async ({ page, team }, testInfo) => {
    const id = getUniqueTestIdentifier(testInfo);
    const member = await createUserAccount({
      email: `dana-${id}@acme.com`,
      name: "Dana Scully",
      slug: `dana-${id}`,
    });
    await TeamUser.query().insert({
      teamId: team.team.id,
      userId: member.user.id,
      userLevel: "member",
    });

    await page.goto(`/${team.account.slug}/settings/members`);
    const row = page.getByRole("row").filter({ hasText: "Dana Scully" });
    await expect(row).toBeVisible();

    await row.locator("button:has(.lucide-ellipsis-vertical)").click();
    await page.getByRole("option", { name: "Remove from Team" }).click();

    // The whole point of the guard: the dialog is driven by a controlled
    // `Modal`, and a mismatched prop left it permanently closed — the menu
    // item worked, and nothing happened.
    const dialog = page.getByRole("alertdialog");
    await expect(
      dialog.getByRole("heading", { name: "Remove Team Member" }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Remove from Team" }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeHidden();
    expect(
      await TeamUser.query().findOne({
        teamId: team.team.id,
        userId: member.user.id,
      }),
    ).toBeUndefined();
  },
);
