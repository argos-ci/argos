import { expect } from "@playwright/test";

import { createDeploymentScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("deployments", async ({ page, team, project, builds }) => {
  // A deployment links to the most recent build sharing its commit — every
  // build of the scenario does — so the expected number follows the scenario
  // rather than being pinned to whichever build happens to come last.
  const latestBuildNumber = Math.max(
    ...Object.values(builds).map((build) => build.number),
  );

  await createDeploymentScenario({
    projectId: project.id,
    accountSlug: team.account.slug,
    projectName: project.name,
  });

  await page.goto(`/${team.account.slug}/${project.name}/deployments`);

  await expect(
    page.getByRole("heading", { name: "Deployments" }),
  ).toBeVisible();
  const buildLink = page.getByRole("link", {
    name: `Build #${latestBuildNumber}`,
  });
  await expect(buildLink).toBeVisible();
  await expect(buildLink).toHaveAttribute(
    "href",
    `/${team.account.slug}/${project.name}/builds/${latestBuildNumber}`,
  );
  await expect(page.getByText("preview-main", { exact: true })).toBeVisible();
  await expect(page.getByText("Production", { exact: true })).toBeVisible();

  await screenshot(page, "project-deployments", {
    replacements: {
      [team.account.slug]: "acme",
    },
  });
});
