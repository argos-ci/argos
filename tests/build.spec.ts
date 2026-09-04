import { expect } from "@playwright/test";

import {
  BuildReview,
  ScreenshotDiff,
} from "../apps/backend/src/database/models";
import {
  BuildScenario,
  createFallbackBaselineScenario,
  createSiblingBuildsScenario,
  createVariantSwitchersScenario,
} from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

const buildExamples: {
  name: string;
  getNumber: (builds: BuildScenario) => number;
  compare?: false;
  /**
   * Assert every thumbnail in the diff list actually decoded. Only worth doing
   * on a build whose snapshots point at the CDN image fixtures: a key nobody
   * uploaded renders as a broken image, and the screenshots below then burn
   * their whole stabilization budget waiting on the CDN to answer the miss.
   */
  expectLoadedImages?: true;
}[] = [
  { name: "orphan", getNumber: (b) => b.orphanBuild.number },
  { name: "reference", getNumber: (b) => b.referenceBuild.number },
  {
    name: "expired",
    getNumber: (b) => b.expiredBuild.number,
    compare: false,
  },
  {
    name: "aborted",
    getNumber: (b) => b.abortedBuild.number,
    compare: false,
  },
  { name: "error", getNumber: (b) => b.errorBuild.number, compare: false },
  {
    name: "changes detected",
    getNumber: (b) => b.diffDetectedBuild.number,
    expectLoadedImages: true,
  },
  { name: "rejected", getNumber: (b) => b.rejectedBuild.number },
  {
    name: "scheduled",
    getNumber: (b) => b.pendingBuild.number,
    compare: false,
  },
  {
    name: "in progress",
    getNumber: (b) => b.inProgressBuild.number,
    compare: false,
  },
  { name: "empty", getNumber: (b) => b.emptyBuild.number, compare: false },
  { name: "stable", getNumber: (b) => b.stableBuild.number },
  {
    name: "stable with fail screenshots",
    getNumber: (b) => b.failBuild.number,
  },
  {
    name: "stable with removed screenshots",
    getNumber: (b) => b.removedBuild.number,
  },
  { name: "subset", getNumber: (b) => b.subsetBuild.number },
];

buildExamples.forEach((build) => {
  loggedTest(build.name, async ({ page, auth, team, project, builds }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const number = build.getNumber(builds);
    await page.goto(`/${team.account.slug}/${project.name}/builds/${number}`);
    await expect(page.getByText(`Build ${number}`)).toBeVisible();
    if (build.compare !== false) {
      await expect(page).toHaveURL(new RegExp(`/builds/${number}/overview$`));
      const startButton = page.getByRole("button", {
        name: /^(Start review|Browse snapshots|Browse test failures)/,
      });
      await expect(startButton).toBeVisible();
      if (build.expectLoadedImages) {
        // `shown` guards against passing before the virtualized diff list has
        // mounted any thumbnail, and `broken` names the offending URLs rather
        // than reporting a bare boolean.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const fixtures = Array.from(document.images).filter((img) =>
                /-\d+x\d+\.(png|jpg)/.test(img.currentSrc),
              );
              return {
                shown: fixtures.length > 0,
                broken: fixtures
                  .filter((img) => !(img.complete && img.naturalWidth > 0))
                  .map((img) => new URL(img.currentSrc).pathname),
              };
            }),
          )
          .toEqual({ shown: true, broken: [] });
      }
      await screenshot(page, `build-overview-${build.name}`, {
        replacements: {
          [team.account.slug]: "acme",
        },
      });
      // Starting the review replaces the overview in history (the whole build
      // view is a single history entry), so navigate forward rather than relying
      // on `goBack` to return to the overview.
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(`/builds/${number}/(?!overview)[^/]+$`),
      );
      // The pane's own heading, not any of the other places the word appears
      // (the view-mode button, the sidebar's changes count).
      await expect(
        page.getByRole("heading", { name: "Changes", exact: true }),
      ).toBeVisible();
    }
    await screenshot(page, `build-${build.name}`, {
      replacements: {
        [team.account.slug]: "acme",
      },
    });
  });
});

loggedTest(
  "subset build ignores removed snapshots",
  async ({ page, auth, team, project, builds }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { number } = builds.subsetBuild;
    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${number}/overview`,
    );

    // The build has 3 unchanged, 1 changed and 2 removed snapshots. Because it
    // only uploaded a subset, the removals mean "test not run", not "snapshot
    // deleted": they must not show up as something to review.
    await expect(page.getByText("A single visual change")).toBeVisible();
    await expect(page.getByText("2 removed")).toHaveCount(0);

    // The total only counts the snapshots the build actually uploaded.
    await page.getByRole("tab", { name: "Info" }).click();
    await expect(page.locator("dt:has-text('Scope') + dd")).toContainText(
      "Subset",
    );
    await expect(
      page.locator("dt:has-text('Total screenshots') + dd"),
    ).toHaveText("4");
  },
);

loggedTest(
  "snapshot compared against a fallback baseline",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createFallbackBaselineScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    // The metadata sidebar states which baseline the snapshot was compared
    // against, since it differs from the snapshot's own name.
    // The snapshot is titled by its own name, and the metadata sidebar names
    // the baseline it was compared against.
    await expect(
      page.getByRole("heading", { name: "home-variant-b.png" }),
    ).toBeVisible();
    await expect(page.getByText("Baseline home.png")).toBeVisible();

    await screenshot(page, "build-fallback-baseline", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });
  },
);
loggedTest(
  "offers the next build of the commit once a review is submitted",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { defaultBuild, storybookBuild, docsBuild, docsProject } =
      await createSiblingBuildsScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${defaultBuild.number}`,
    );
    await page.getByRole("button", { name: "Submit review" }).click();
    await page.getByRole("button", { name: "Approve" }).click();

    // Two more builds ran on the same commit and nobody has reviewed them, so
    // finishing this one hands the reviewer straight to the next.
    //
    // The prompt waits on the review mutation's response, and the server only
    // answers it once the build notifications and the automations have been
    // enqueued — a broker round-trip on top of the request.
    const dialog = page.getByRole("dialog", { name: "Review the next build" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByText("2 more builds ran on this commit"),
    ).toBeVisible();
    // The row carries what the reviewer needs to choose: which build it is,
    // which project it ran in, and where its review stands.
    await expect(
      dialog.getByRole("link", {
        name: `storybook ${team.account.slug}/${project.name} Changes detected`,
      }),
    ).toBeVisible();
    // The commit reaches beyond this project, and that build is offered with a
    // link into its own project.
    await expect(
      dialog.getByRole("link", {
        name: `default ${team.account.slug}/${docsProject.name} Changes detected`,
      }),
    ).toHaveAttribute(
      "href",
      `/${team.account.slug}/${docsProject.name}/builds/${docsBuild.number}/overview`,
    );

    await screenshot(page, "build-next-review-dialog", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    await dialog.getByRole("link", { name: "Review next build" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/builds/${storybookBuild.number}/overview$`),
    );
    // The prompt belongs to the build it was raised on: it must not survive
    // the jump and keep pointing at the build the reviewer just left.
    await expect(dialog).toBeHidden();

    // Landing on the next build means reviewing *its* snapshots: starting the
    // review has to open a snapshot of the build being looked at, not one the
    // previous build left in the list.
    const storybookDiff = await ScreenshotDiff.query()
      .findOne({ buildId: storybookBuild.id })
      .throwIfNotFound();
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/builds/${storybookBuild.number}/${storybookDiff.id}$`),
    );
    await expect(page.getByRole("heading", { name: "home.png" })).toBeVisible();
  },
);

loggedTest(
  "prompts for the next build from the review dialog too",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { defaultBuild } = await createSiblingBuildsScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${defaultBuild.number}`,
    );
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();
    // Marking the build's only change opens the review dialog on its own. That
    // dialog hosts a review form outside the page's children — it has to reach
    // the same next-build prompt the header popover does. IconButtons carry no
    // accessible name, so the thumb icon locates the button.
    await page.locator("button:has(.lucide-thumbs-up)").first().click();
    const reviewDialog = page.getByRole("dialog", {
      name: "Submit your review",
    });
    await expect(reviewDialog).toBeVisible();

    await reviewDialog.getByRole("button", { name: "Approve" }).click();
    const dialog = page.getByRole("dialog", { name: "Review the next build" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByRole("link", { name: "Review next build" }),
    ).toBeVisible();
  },
);

loggedTest(
  "header switches between the builds of a commit",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { defaultBuild, storybookBuild, docsBuild, docsProject } =
      await createSiblingBuildsScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${defaultBuild.number}`,
    );
    await page.getByRole("button", { name: "Switch build" }).click();

    // Every build of the commit is listed with where its review stands, the
    // one being looked at included, and each names the project it ran in — the
    // two projects of the commit both call their suite `default`. The menu kit
    // is a listbox driven by a search field, so its rows are options rather
    // than menu items.
    const menu = page.getByRole("listbox");
    await expect(
      menu.getByRole("option", {
        name: `Changes detected ${defaultBuild.name} #${defaultBuild.number} ${team.account.slug}/${project.name}`,
      }),
    ).toBeVisible();
    await expect(
      menu.getByRole("option", {
        name: `Changes detected ${storybookBuild.name} #${storybookBuild.number} ${team.account.slug}/${project.name}`,
      }),
    ).toBeVisible();
    const docsItem = menu.getByRole("option", {
      name: `Changes detected ${docsBuild.name} #${docsBuild.number} ${team.account.slug}/${docsProject.name}`,
    });
    await expect(docsItem).toBeVisible();

    await screenshot(page, "build-switcher", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    // Switching lands on the build of the other project, not on a build of
    // this one that happens to share its number.
    await docsItem.click();
    await expect(page).toHaveURL(
      new RegExp(
        `/${team.account.slug}/${docsProject.name}/builds/${docsBuild.number}/overview$`,
      ),
    );
  },
);

loggedTest(
  "build sidebar marks a review an agent submitted for its reviewer",
  async ({ page, auth, team, project, builds }) => {
    // The seeded approval has no author, so it renders as "Unknown user" with
    // no avatar to badge. Give it one, and an agent.
    await BuildReview.query()
      .patch({ userId: auth.user.id, agent: "claude-code" })
      .where({ buildId: builds.acceptedBuild.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${builds.acceptedBuild.number}`,
    );

    const badge = page.getByRole("img", {
      name: "Reviewed through Claude Code on behalf of this user",
    });
    await expect(badge.first()).toBeVisible();

    await screenshot(page, "build-agent-review");
  },
);

loggedTest(
  "undoes and redoes review marks with the keyboard",
  async ({ page, auth, team, project, builds }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${builds.diffDetectedBuild.number}`,
    );
    // A standalone changed snapshot, so the mark lands on it alone: the other
    // changed ones are bundled under a "3 similar" group, which is marked as
    // a whole.
    await page
      .getByRole("button", { name: "dummy-375x1440.png" })
      .first()
      .click();

    // `aria-pressed` narrows it to the toolbar's own accept button: a diff
    // list header carries the same thumb once its whole group is accepted, and
    // it comes first in the document.
    const acceptButton = page.locator(
      "button[aria-pressed]:has(.lucide-thumbs-up)",
    );

    // Marking a snapshot takes the reviewer to the next one, which is why a
    // mistake is always noticed from somewhere else: undo has to put the mark
    // back *and* bring its snapshot back on screen.
    const firstDiffURL = page.url();
    await acceptButton.click();
    await expect(page).not.toHaveURL(firstDiffURL);
    const secondDiffURL = page.url();
    await acceptButton.click();
    await expect(page).not.toHaveURL(secondDiffURL);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(secondDiffURL);
    await expect(acceptButton).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page).toHaveURL(firstDiffURL);
    await expect(acceptButton).toHaveAttribute("aria-pressed", "false");

    // Shift is the only thing telling redo apart from undo, so a redo that
    // also read as an undo would walk the reviewer backwards here instead of
    // forwards.
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(page).toHaveURL(firstDiffURL);
    await expect(acceptButton).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(page).toHaveURL(secondDiffURL);
    await expect(acceptButton).toHaveAttribute("aria-pressed", "true");
  },
);

loggedTest(
  "seats the variant switchers and a long name on one toolbar",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build, variantKey } = await createVariantSwitchersScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    // Both switchers offer every sibling, whichever one the review opened on.
    // Scoped to the group: the title beside it is a link to the test, and its
    // name starts with "chromium/" — unscoped, so would the browser button.
    const variants = page.getByRole("group", { name: "Snapshot variants" });
    for (const name of ["Chromium", "Firefox", "390", "1280"]) {
      await expect(variants.getByRole("link", { name })).toBeVisible();
    }
    // The color scheme cannot be switched — every sibling is dark — so it is
    // stated in the Metadata panel rather than offered in the toolbar.
    await expect(variants.getByText("Dark")).toHaveCount(0);
    await expect(page.getByText("Dark", { exact: true })).toBeVisible();

    // The question this build exists to answer: the name is 70-odd characters
    // and shares the row with the switchers. `line-clamp-2` swallows a third
    // line without a trace, so overflow is the only thing that tells us it
    // cropped.
    const title = page.getByRole("heading", {
      name: new RegExp(variantKey.replaceAll("/", "\\/")),
    });
    await expect(title).toBeVisible();
    await expect
      .poll(() =>
        title.evaluate((el) => el.scrollHeight - el.clientHeight <= 1),
      )
      .toBe(true);

    await screenshot(page, "build-variant-switchers", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });
  },
);

loggedTest(
  "marks the variants holding a change",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createVariantSwitchersScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    const variants = page.getByRole("group", { name: "Snapshot variants" });
    const segment = (name: string) =>
      variants.getByRole("link", { name, exact: true });

    // Every marker the switchers can draw, in one toolbar: the reviewer sees
    // which siblings are worth the jump before making it. The status rides the
    // accessible name because the tooltip carrying it is out of the
    // accessibility tree.
    await expect(segment("Chromium, Changed")).toBeVisible();
    await expect(segment("Firefox, Removed")).toBeVisible();
    await expect(segment("390px, Added")).toBeVisible();
    await expect(segment("1280px, Changed")).toBeVisible();

    await screenshot(page, "build-variant-statuses", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    // And the other half of the rule: Firefox's 390 sibling is unchanged, so
    // that segment says nothing at all rather than marking itself "unchanged".
    await segment("Firefox, Removed").click();
    await expect(segment("390px")).toBeVisible();
    await expect(segment("Firefox, Removed")).toHaveAttribute(
      "aria-current",
      "page",
    );

    await screenshot(page, "build-variant-statuses-unchanged", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });
  },
);

loggedTest(
  "keeps the other variant when switching one",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build, variantKey } = await createVariantSwitchersScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    const variants = page.getByRole("group", { name: "Snapshot variants" });
    const snapshotName = (browser: string, width: number) =>
      new RegExp(
        `^${browser}/${variantKey.replaceAll("/", "\\/")} vw-${width}\\.png$`,
      );

    // The build is a 2×2: two browsers, two viewports. Walking one dimension
    // has to leave the other where it was — the reviewer asked for a different
    // browser, not a different viewport.
    await expect(
      page.getByRole("heading", { name: snapshotName("chromium", 1280) }),
    ).toBeVisible();

    await variants.getByRole("link", { name: "Firefox" }).click();
    await expect(
      page.getByRole("heading", { name: snapshotName("firefox", 1280) }),
    ).toBeVisible();

    await variants.getByRole("link", { name: "390" }).click();
    await expect(
      page.getByRole("heading", { name: snapshotName("firefox", 390) }),
    ).toBeVisible();

    // And back the other way, so this cannot pass on the diff list's order.
    await variants.getByRole("link", { name: "Chromium" }).click();
    await expect(
      page.getByRole("heading", { name: snapshotName("chromium", 390) }),
    ).toBeVisible();
  },
);
