import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

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

  for (const section of sections) {
    await page
      .getByRole("link", { name: section.name, exact: true })
      .click();
    await screenshot(page, `project-settings-${section.id}`, {
      replacements: section.replacements,
    });
  }
});
