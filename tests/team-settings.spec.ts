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
  "team settings - provision members with SCIM",
  async ({ page, team }, testInfo) => {
    const id = getUniqueTestIdentifier(testInfo);
    await page.goto(`/${team.account.slug}/settings/authentication`);
    await expect(
      page.getByRole("heading", { name: "SCIM Provisioning" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Generate token" }).click();
    const generateDialog = page.getByRole("dialog", {
      name: "Generate SCIM Token",
    });
    await generateDialog
      .getByRole("button", { name: "Generate token" })
      .click();
    const createdDialog = page.getByRole("dialog", {
      name: "SCIM Token Generated",
    });
    const token = await createdDialog.locator("code").textContent();
    expect(token).toMatch(/^argos_scim_/);
    await createdDialog.getByRole("button", { name: "Close" }).click();
    await expect(createdDialog).toBeHidden();
    await expect(page.getByText("never used")).toBeVisible();

    // What the Identity Provider does with it.
    const provisioned = await page.request.post("/scim/v2/Users", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/scim+json",
      },
      data: JSON.stringify({
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
        userName: `fox-${id}@acme.com`,
        displayName: "Fox Mulder",
        emails: [{ value: `fox-${id}@acme.com`, primary: true }],
        active: true,
      }),
    });
    expect(provisioned.status()).toBe(201);

    await page.goto(`/${team.account.slug}/settings/members`);
    await expect(
      page.getByRole("row").filter({ hasText: "Fox Mulder" }),
    ).toBeVisible();

    await page.goto(`/${team.account.slug}/settings/authentication`);
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    const revokeDialog = page.getByRole("alertdialog", {
      name: "Revoke SCIM Token",
    });
    await revokeDialog.getByRole("button", { name: "Revoke token" }).click();
    await expect(revokeDialog).toBeHidden();
    await expect(page.getByText("No SCIM token")).toBeVisible();

    const rejected = await page.request.patch(
      `/scim/v2/Users/${(await provisioned.json()).id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/scim+json",
        },
        data: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: [{ op: "replace", value: { active: false } }],
        }),
      },
    );
    expect(rejected.status()).toBe(401);
  },
);

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
