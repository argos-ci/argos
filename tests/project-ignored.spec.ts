import { expect, type Page } from "@playwright/test";

import {
  IgnoredChange,
  ScreenshotDiff,
} from "../apps/backend/src/database/models";
import {
  createIgnoredChangeScenario,
  createReviewableChangeScenario,
} from "../apps/backend/src/database/seeds";
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
  "ignoring and unignoring a change from the build toolbar",
  async ({ page, team, project, auth }) => {
    const { build } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });
    // The build page shows its snapshots only once the build has concluded.
    await build.$query().patch({ conclusion: "changes-detected" });
    const diff = await ScreenshotDiff.query()
      .findOne({ buildId: build.id })
      .throwIfNotFound();

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}/${diff.id}`,
    );

    const flag = page
      .getByRole("button", { name: "Ignore change" })
      .and(page.locator("[aria-pressed]"));
    const dialog = page.getByRole("dialog");

    await expect(flag).toHaveAttribute("aria-pressed", "true");
    await flag.click();
    await expect(
      dialog.getByRole("heading", { name: "Unignore Change" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Unignore Change" }).click();

    await expect(flag).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Change unignored")).toBeVisible();

    await flag.click();
    await expect(
      dialog.getByRole("heading", { name: "Ignore Change" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Ignore Change" }).click();
    await expect(flag).toHaveAttribute("aria-pressed", "true");

    await page.goto(`/${team.account.slug}/${project.name}/ignored`);
    await expect(
      page.getByRole("row").filter({ hasText: "penelope-argos.jpg" }),
    ).toBeVisible();
  },
);

loggedTest(
  "ignoring a change skips the dialog once it is dismissed for the session",
  async ({ page, team, project, auth }) => {
    const { build } = await createIgnoredChangeScenario({
      projectId: project.id,
      userId: auth.user.id,
    });
    await build.$query().patch({ conclusion: "changes-detected" });
    // Drop the ignore so the flag starts on the side this test presses from.
    await IgnoredChange.query().where("projectId", project.id).delete();
    const diff = await ScreenshotDiff.query()
      .findOne({ buildId: build.id })
      .throwIfNotFound();

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}/${diff.id}`,
    );
    const flag = page
      .getByRole("button", { name: "Ignore change" })
      .and(page.locator("[aria-pressed]"));
    await expect(flag).toHaveAttribute("aria-pressed", "false");

    await page.evaluate(() => {
      window.sessionStorage.setItem("ignoreChangeDontShowAgain", "true");
    });
    await flag.click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(flag).toHaveAttribute("aria-pressed", "true");
    await page.goto(`/${team.account.slug}/${project.name}/ignored`);
    await expect(
      page.getByRole("row").filter({ hasText: "penelope-argos.jpg" }),
    ).toBeVisible();
  },
);

loggedTest(
  "ignoring a snapshot still to review keeps the flag when it comes back",
  async ({ page, team, project }) => {
    const { build, tests } = await createReviewableChangeScenario({
      projectId: project.id,
    });
    const [ignored] = tests;
    const diff = await ScreenshotDiff.query()
      .findOne({ buildId: build.id, testId: ignored.id })
      .throwIfNotFound();

    const diffURL = `/${team.account.slug}/${project.name}/builds/${build.number}/${diff.id}`;
    await page.goto(diffURL);
    const flag = page
      .getByRole("button", { name: "Ignore change" })
      .and(page.locator("[aria-pressed]"));
    await expect(flag).toHaveAttribute("aria-pressed", "false");

    await flag.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Ignore Change" })
      .click();

    // Ignoring a snapshot still to review also marks it accepted, which moves
    // to the next one and takes this toolbar with it.
    await expect(page).not.toHaveURL(diffURL);

    await openSnapshot(page, ignored.name, "Accepted");
    await expect(page).toHaveURL(diffURL);
    await expect(flag).toHaveAttribute("aria-pressed", "true");
  },
);

loggedTest(
  "ignoring an approved snapshot leaves it selected",
  async ({ page, team, project }) => {
    const { build, tests } = await createReviewableChangeScenario({
      projectId: project.id,
    });
    const [approved] = tests;
    const diff = await ScreenshotDiff.query()
      .findOne({ buildId: build.id, testId: approved.id })
      .throwIfNotFound();

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}/${diff.id}`,
    );
    await page.locator("button:has(.lucide-thumbs-up)").click();
    const card = await openSnapshot(page, approved.name, "Accepted");

    // The thick ring says which snapshot is being looked at. Asserted on the
    // class because nothing else carries it.
    const selected = card.locator("[class~='ring-3']");
    await expect(selected).toBeVisible();

    await page
      .getByRole("button", { name: "Ignore change" })
      .and(page.locator("[aria-pressed]"))
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Ignore Change" })
      .click();

    await expect(
      page
        .getByRole("button", { name: "Ignore change" })
        .and(page.locator("[aria-pressed]")),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toBeVisible();
  },
);

/**
 * Click a snapshot in the sidebar, opening its group when collapsed — where a
 * reviewed one lands — and the list itself, which a deep link leaves on Info.
 */
async function openSnapshot(page: Page, name: string, group: string) {
  await page.getByRole("tab", { name: "Snapshots" }).click();
  const card = page.getByRole("button", { name });
  await expect(async () => {
    if (!(await card.isVisible())) {
      await page.getByRole("button", { name: group }).click();
    }
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await card.click();
  return card;
}
