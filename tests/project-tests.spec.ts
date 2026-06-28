import { expect } from "@playwright/test";

import { createTestChangeScenario } from "../apps/backend/src/database/seeds";
import { formatTestId } from "../apps/backend/src/graphql/services/test";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest("tests", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}/tests`);
  await expect(page.getByRole("heading", { name: "Tests" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /penelope-argos\.jpg/ }),
  ).toBeVisible();
  await screenshot(page, "project-tests");
});

loggedTest("test detail", async ({ page, team, project, builds }) => {
  void builds;
  await page.goto(`/${team.account.slug}/${project.name}/tests`);
  await page.getByRole("link", { name: /penelope-argos\.jpg/ }).click();
  await expect(
    page.getByRole("heading", { name: "penelope-argos.jpg" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Changes/ })).toBeVisible();
  const match = page.url().match(/\/tests\/([^/?#]+)/);
  if (!match?.[1]) {
    throw new Error("Test ID should be present in the URL");
  }
  const testId = match[1];
  await screenshot(page, "test-detail", {
    replacements: {
      [testId]: "SPARKLE-XXX",
    },
  });
});

loggedTest("test view with a change", async ({ page, team, project }) => {
  const { test } = await createTestChangeScenario({
    projectId: project.id,
    keyPrefix: `${project.id}-`,
  });
  const testId = formatTestId({ projectName: project.name, testId: test.id });

  await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

  // The change's snapshot diff viewer is rendered.
  await expect(
    page.getByRole("heading", { name: "penelope-argos.jpg" }),
  ).toBeVisible();
  await expect(page.getByText("Occurrences")).toBeVisible();
  await expect(page.getByText("Baseline", { exact: false })).toBeVisible();

  // No comment affordances in this view, despite the user being able to review.
  await expect(page.getByRole("button", { name: "Comment tool" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Move tool" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /comments$/ })).toHaveCount(0);

  await screenshot(page, "test-view-change");
});
