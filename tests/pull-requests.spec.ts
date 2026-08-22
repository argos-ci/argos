import { expect } from "@playwright/test";

import { createPullRequestScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("pull requests", async ({ page, team, project }) => {
  const scenario = await createPullRequestScenario({ projectId: project.id });

  await page.goto(`/${team.account.slug}/${project.name}/pull-requests`);

  await expect(
    page.getByRole("heading", { name: "Pull requests" }),
  ).toBeVisible();

  // One row per pull request, whatever its state.
  await expect(page.getByText("Add dark mode to the dashboard")).toBeVisible();
  await expect(page.getByText("Fix login button alignment")).toBeVisible();
  await expect(page.getByText("Refactor color tokens")).toBeVisible();
  await expect(page.getByText("Experiment with a denser grid")).toBeVisible();

  // The most recent builds get chips linking to their build page; the rest
  // collapse into an overflow counter.
  const latestBuild = scenario.openPullRequestBuilds[0];
  const buildChip = page.getByRole("link", {
    name: `#${latestBuild.number} ${latestBuild.name}`,
  });
  await expect(buildChip).toBeVisible();
  await expect(buildChip).toHaveAttribute(
    "href",
    `/${team.account.slug}/${project.name}/builds/${latestBuild.number}`,
  );
  await expect(page.getByText("+2", { exact: true })).toBeVisible();

  // Media thumbnails link to their share page, extra ones collapse too.
  const afterMedia = scenario.openPullRequestMedias.find(
    (media) => media.state === "after",
  );
  const mediaLink = page.getByRole("link", { name: "checkout.png (after)" });
  await expect(mediaLink).toBeVisible();
  await expect(mediaLink).toHaveAttribute(
    "href",
    `/m/${afterMedia?.shareToken}`,
  );
  await expect(page.getByText("+1", { exact: true })).toBeVisible();

  await screenshot(page, "project-pull-requests");
});
