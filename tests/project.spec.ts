import { expect } from "@playwright/test";

import { ProjectUser } from "../apps/backend/src/database/models";
import { createUserAccount } from "../apps/backend/src/database/seeds";
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
    {
      name: "Authentication",
      id: "authentication",
      replacements: {
        [project.token]: "arp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      },
    },
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
  "project settings - the regenerate token dialog names itself",
  async ({ page, team, auth, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    await page.goto(
      `/${team.account.slug}/${project.name}/settings/authentication`,
    );
    await page.getByRole("button", { name: "Regenerate token" }).click();

    // One box, and it is the one the title names. Nesting a `Dialog` inside
    // another leaves a second `aria-modal` around it with nothing to name it,
    // which a screen reader reads as a nameless dialog holding a dialog.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(1);
    await expect(dialog).toHaveAccessibleName("Regenerate token");
  },
);
