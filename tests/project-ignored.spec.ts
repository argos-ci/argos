import { expect } from "@playwright/test";

import { ScreenshotDiff } from "../apps/backend/src/database/models";
import { createIgnoredChangeScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest(
  "ignored changes empty state",
  async ({ page, team, project, auth }) => {
    void auth;
    await page.goto(`/${team.account.slug}/${project.name}`);

    // The tab is reachable from the project navigation.
    await page.getByRole("tab", { name: "Ignored" }).click();

    await expect(
      page.getByRole("heading", { name: "Nothing is ignored yet" }),
    ).toBeVisible();
    // The empty state teaches the three parts of the flow.
    await expect(
      page.getByRole("heading", { name: "Flag the change" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Argos matches it exactly" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Keep the list honest" }),
    ).toBeVisible();

    // The action comes first, with the docs link quietly beneath it.
    await expect(
      page.getByRole("link", { name: "Configure auto-ignore" }),
    ).toHaveAttribute(
      "href",
      `/${team.account.slug}/${project.name}/settings/flaky-detection`,
    );
    await expect(
      page.getByRole("link", { name: "Learn more" }),
    ).toHaveAttribute(
      "href",
      "https://argos-ci.com/docs/learn/reliability-and-flakiness/ignored-changes",
    );

    await screenshot(page, "project-ignored-empty");
  },
);

loggedTest(
  "auto-ignored changes are badged",
  async ({ page, team, project, auth }) => {
    const { test } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
      auto: true,
    });

    await page.goto(`/${team.account.slug}/${project.name}/ignored`);

    const row = page.getByRole("row").filter({ hasText: test.name });
    // The bot stays named as the author, with the badge alongside it.
    await expect(row.getByText("Argos Bot")).toBeVisible();
    const badge = row.getByText("Auto", { exact: true });
    await expect(badge).toBeVisible();

    // The tooltip explains it and offers the setting that governs it. The
    // first pointer event on a freshly mounted virtualized row can be swallowed
    // by the measuring re-render, so the hover is retried rather than asserted
    // on a single attempt.
    await expect(async () => {
      await page.mouse.move(0, 0);
      await badge.hover();
      await expect(
        page.getByRole("heading", { name: "Ignored automatically" }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass();
    await expect(
      page.getByRole("link", { name: "Configure auto-ignore" }),
    ).toHaveAttribute(
      "href",
      `/${team.account.slug}/${project.name}/settings/flaky-detection`,
    );
  },
);

loggedTest("ignored changes list", async ({ page, team, project, auth }) => {
  const { test } = await createIgnoredChangeScenario({
    projectId: project.id,
    userId: auth.user.id,
  });

  await page.goto(`/${team.account.slug}/${project.name}/ignored`);

  await expect(
    page.getByRole("heading", { name: "Ignored changes" }),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: test.name });
  await expect(row).toBeVisible();
  // Ignored by the seeded user, and it has fired 4 times since.
  await expect(row.getByText("Kyle Bertolino")).toBeVisible();
  await expect(row.getByText("4", { exact: true })).toBeVisible();

  // The thumbnail is served from the CDN and actually renders.
  await expect
    .poll(() =>
      row
        .getByRole("img")
        .first()
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    )
    .toBe(true);

  await screenshot(page, "project-ignored-list");
});

loggedTest(
  "unignoring a change removes it from the list, and Undo puts it back",
  async ({ page, team, project, auth }) => {
    const { test } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });

    await page.goto(`/${team.account.slug}/${project.name}/ignored`);

    const row = page.getByRole("row").filter({ hasText: test.name });
    // Revealed on hover, so it stays in the tab order: asserted on opacity,
    // which Playwright's `toBeVisible` would not catch.
    const unignore = row.getByRole("button", { name: "Unignore" });
    await expect(unignore).toHaveCSS("opacity", "0");
    await expect(async () => {
      await page.mouse.move(0, 0);
      await row.hover();
      await expect(unignore).toHaveCSS("opacity", "1", { timeout: 2_000 });
    }).toPass();
    await unignore.click();

    const dialog = page.getByRole("alertdialog");
    await expect(
      dialog.getByRole("heading", { name: "Unignore change" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Unignore change" }).click();

    // The row leaves the list and the page falls back to the empty state.
    await expect(
      page.getByRole("heading", { name: "Nothing is ignored yet" }),
    ).toBeVisible();

    // The confirmation toast offers a way back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(
      page.getByRole("row").filter({ hasText: test.name }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nothing is ignored yet" }),
    ).toBeHidden();
  },
);

loggedTest(
  "unignoring a change from the build toolbar",
  async ({ page, team, project, auth }) => {
    const { build } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });
    // The build page shows its snapshots only once the build has concluded,
    // and the scenario builds one for the test trends page, which does not
    // care either way.
    await build.$query().patch({ conclusion: "changes-detected" });
    const diff = await ScreenshotDiff.query()
      .findOne({ buildId: build.id })
      .throwIfNotFound();

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}/${diff.id}`,
    );

    // The change arrives ignored, so the flag offers to take it back.
    const flag = page.getByRole("button", {
      name: "Unignore change",
      exact: true,
    });
    await expect(flag).toBeVisible();
    await flag.click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Unignore Change" }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Unignore Change", exact: true })
      .click();

    // The flag flips without a reload, and the ledger has nothing left in it.
    await expect(
      page.getByRole("button", { name: "Ignore change", exact: true }),
    ).toBeVisible();
    await page.goto(`/${team.account.slug}/${project.name}/ignored`);
    await expect(
      page.getByRole("heading", { name: "Nothing is ignored yet" }),
    ).toBeVisible();
  },
);
