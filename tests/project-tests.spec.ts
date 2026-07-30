import { expect } from "@playwright/test";

import {
  createIgnoredChangeScenario,
  createTestChangeScenario,
} from "../apps/backend/src/database/seeds";
import { formatTestId } from "../apps/backend/src/util/test-id";
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
  const { test } = await createTestChangeScenario({ projectId: project.id });
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

  // The change image is served from the CDN and actually renders (it isn't a
  // broken image).
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "Changes screenshot" })
        .first()
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);

  await screenshot(page, "test-view-change");
});

loggedTest(
  "test view flags ignored changes and filters on them",
  async ({ page, team, project, auth }) => {
    const { test } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    // The badge is on the card in the list, without hovering it.
    const badge = page
      .getByRole("region", { name: "Changes" })
      .getByText("Ignored", { exact: true });
    await expect(badge).toBeVisible();

    // Ignored changes are part of the default view, and the filter narrows it
    // down to them.
    await expect(page.getByRole("heading", { name: /^Changes/ })).toBeVisible();
    await page.getByRole("button", { name: "Ignored", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /^Ignored changes/ }),
    ).toBeVisible();
    await expect(badge).toBeVisible();
    // The filter is in the URL, so the view survives a reload and can be shared.
    await expect(page).toHaveURL(/changes=ignored/);

    await screenshot(page, "test-view-ignored-changes");
  },
);

loggedTest(
  "test view lets a reviewer comment on the test",
  async ({ page, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(`/${team.account.slug}/${project.name}/tests/${testId}`);

    // The right column carries the change history and the activity feed.
    await expect(page.getByText("First change")).toBeVisible();
    await expect(page.getByText("Last change")).toBeVisible();
    const activity = page.getByRole("heading", { name: "Activity" });
    await expect(activity).toBeVisible();
    await expect(page.getByText("Test created")).toBeVisible();

    // Posting a comment adds it to the feed.
    const editor = page.getByLabel("Add a comment");
    await editor.click();
    await editor.fill("This test keeps flapping on CI.");
    await page.getByRole("button", { name: "Submit the comment" }).click();
    await expect(
      page.getByText("This test keeps flapping on CI."),
    ).toBeVisible();

    await screenshot(page, "test-view-comment");
  },
);

loggedTest(
  "test view explains an empty ignored list",
  async ({ page, team, project }) => {
    const { test } = await createTestChangeScenario({ projectId: project.id });
    const testId = formatTestId({ projectName: project.name, testId: test.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/tests/${testId}?changes=ignored`,
    );

    // The test has a change, but none of them is ignored.
    await expect(
      page.getByRole("heading", { name: "No ignored changes" }),
    ).toBeVisible();

    // The empty state hands back the unfiltered list.
    await page.getByRole("button", { name: "See all changes" }).click();
    await expect(page.getByRole("heading", { name: /^Changes/ })).toBeVisible();
    await expect(page.getByText("Occurrences")).toBeVisible();
  },
);
