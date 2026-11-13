import { expect } from "@playwright/test";

import {
  ProjectToken,
  ProjectTokenProject,
  ProjectUser,
} from "../apps/backend/src/database/models";
import {
  createProject,
  createUserAccount,
} from "../apps/backend/src/database/seeds";
import { insertProjectToken } from "../apps/backend/src/database/services/project-token";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getUniqueTestIdentifier, screenshot } from "./util";

loggedTest("project builds", async ({ page, auth, team, project, builds }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}`);
  await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Builds" })).toBeVisible();
  await screenshot(page, "project-builds");
});

loggedTest(
  "getting started - replace the project's own tokens",
  async ({ page, team, auth }, testInfo) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const id = getUniqueTestIdentifier(testInfo);
    const project = await createProject({
      accountId: team.account.id,
      name: `onboarding-${id}`,
    });
    const other = await createProject({
      accountId: team.account.id,
      name: `other-${id}`,
    });
    await insertProjectToken({
      accountId: team.account.id,
      name: "Monorepo CI",
      token: ProjectToken.generateToken(),
      permissions: ["builds:write"],
      projectIds: [project.id, other.id],
    });

    await page.goto(`/${team.account.slug}/${project.name}`);
    await page.getByRole("button", { name: "Generate token" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "Delete Existing Token?",
    });
    // Deleting a token linked to other projects too would break them.
    await expect(dialog.getByRole("listitem")).toHaveText([/^Default token/]);
    // The page shows a loader for as long as it waits for a first build.
    const stabilize = { waitForAriaBusy: false };
    await screenshot(page, "project-getting-started-existing-token", {
      element: dialog,
      stabilize,
    });
    await dialog.getByRole("button", { name: "Delete and generate" }).click();
    await expect(dialog).toBeHidden();

    const step = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Install Argos" }) });
    await expect(step).toContainText("Your project token is ready.");
    const token = await step.locator("pre code").first().textContent();
    if (!token) {
      throw new Error("Token not shown");
    }
    expect(token).toMatch(/^argos_/);
    await expect(step.locator("pre code").nth(1)).toContainText(token);
    await screenshot(page, "project-getting-started-token", {
      element: step,
      stabilize,
      replacements: { [token]: "argos_0123456789abcdefghijklmnopqrstuvwx" },
    });

    const tokens = await ProjectToken.query()
      .whereIn(
        "id",
        ProjectTokenProject.query()
          .select("projectTokenId")
          .where("projectId", project.id),
      )
      .orderBy("name");
    expect(tokens.map((token) => token.name)).toEqual([
      "Getting started",
      "Monorepo CI",
    ]);
  },
);

loggedTest("project settings", async ({ page, team, auth, project }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
  await page.goto(`/${team.account.slug}/${project.name}/settings`);
  await expect(
    page.getByRole("heading", { name: "Project Settings" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Deployments" })).toBeVisible();

  void auth;

  const sections: {
    name: string;
    id: string;
    replacements?: Record<string, string>;
  }[] = [
    {
      name: "General",
      id: "general",
      replacements: { [team.account.slug]: "acme" },
    },
    { name: "Authentication", id: "authentication" },
    { name: "Access management", id: "access-management" },
    { name: "Git", id: "git" },
    { name: "Baseline builds", id: "baseline-builds" },
    { name: "Flaky detection", id: "flaky-detection" },
    { name: "Deployments", id: "deployments" },
  ];

  const settingsUrl = `/${team.account.slug}/${project.name}/settings`;

  for (const section of sections) {
    await page.getByRole("link", { name: section.name, exact: true }).click();
    const expectedUrl =
      section.id === "general" ? settingsUrl : `${settingsUrl}/${section.id}`;
    await page.waitForURL(expectedUrl);
    await expect(
      page.getByRole("link", { name: section.name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await screenshot(page, `project-settings-${section.id}`, {
      replacements: section.replacements,
    });
  }
});

loggedTest(
  "project settings - remove a contributor from the project",
  async ({ page, team, auth, project }, testInfo) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const id = getUniqueTestIdentifier(testInfo);
    const contributor = await createUserAccount({
      email: `fox-${id}@acme.com`,
      name: "Fox Mulder",
      slug: `fox-${id}`,
    });
    await ProjectUser.query().insert({
      projectId: project.id,
      userId: contributor.user.id,
      userLevel: "viewer",
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/settings/access-management`,
    );
    const row = page.getByRole("row").filter({ hasText: "Fox Mulder" });
    await expect(row).toBeVisible();
    await row.getByRole("button").last().click();
    await page.getByRole("option", { name: "Remove from Project" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(
      dialog.getByRole("heading", { name: "Remove Project contributor" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Remove from Project" }).click();
    await expect(row).toBeHidden();
  },
);

loggedTest(
  "project settings - rotate a project token",
  async ({ page, team, auth, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    await page.goto(
      `/${team.account.slug}/${project.name}/settings/authentication`,
    );
    const previousRow = page
      .getByRole("row")
      .filter({ hasText: "Default token" });
    await expect(previousRow).toBeVisible();

    await page.getByRole("button", { name: "Create token" }).click();
    // One box, and it is the one the title names. Nesting a `Dialog` inside
    // another leaves a second `aria-modal` around it with nothing to name it,
    // which a screen reader reads as a nameless dialog holding a dialog.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toHaveAccessibleName("Create Project Token");
    await dialog
      .getByRole("textbox", { name: "Token name" })
      .fill("GitHub Actions");
    await dialog.getByRole("button", { name: "Create token" }).click();

    const createdDialog = page.getByRole("dialog", {
      name: "Project Token Created",
    });
    await expect(createdDialog.getByText(/^argos_[a-z1-9]{34}$/)).toBeVisible();
    await createdDialog.getByRole("button", { name: "Close" }).click();
    await expect(createdDialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: "GitHub Actions" });
    await expect(row).toBeVisible();

    await previousRow
      .getByRole("button", { name: "Default token options" })
      .click();
    await page.getByRole("option", { name: "Revoke" }).click();
    const revokeDialog = page.getByRole("alertdialog", {
      name: "Revoke Project Token",
    });
    await revokeDialog.getByRole("button", { name: "Revoke" }).click();
    await expect(previousRow).toBeHidden();
    await expect(row).toBeVisible();
  },
);
