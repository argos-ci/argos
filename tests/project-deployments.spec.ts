import { expect } from "@playwright/test";

import { createDeploymentScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, getPlanLabel, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest(
  "project deployments page",
  async ({ page, team, plan, project, builds }) => {
    void builds;

    await createDeploymentScenario({
      projectId: project.id,
      accountSlug: team.account.slug,
      projectName: project.name,
    });

    await page.goto(`/${team.account.slug}/${project.name}/deployments`);

    await expect(
      page.getByRole("heading", { name: "Deployments" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Build #14" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Build #14" })).toHaveAttribute(
      "href",
      `/${team.account.slug}/${project.name}/builds/14`,
    );
    await expect(page.getByText("preview-main", { exact: true })).toBeVisible();
    await expect(page.getByText("Production", { exact: true })).toBeVisible();

    await screenshot(page, "project-deployments", {
      replacements: {
        [getPlanLabel(plan.name)]: "Pro",
      },
    });
  },
);
