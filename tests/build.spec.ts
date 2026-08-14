import { expect } from "@playwright/test";

import { BuildReview } from "../apps/backend/src/database/models";
import {
  BuildScenario,
  createFallbackBaselineScenario,
  createSiblingBuildsScenario,
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
      await expect(page.getByText(`Changes from`)).toBeVisible();
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
    const { defaultBuild, storybookBuild } = await createSiblingBuildsScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${defaultBuild.number}`,
    );
    await page.getByRole("button", { name: "Submit review" }).click();
    await page.getByRole("button", { name: "Approve" }).click();

    // The other build ran on the same commit and nobody has reviewed it, so
    // finishing this one hands the reviewer straight to it.
    //
    // The prompt waits on the review mutation's response, and the server only
    // answers it once the build notifications and the automations have been
    // enqueued — a broker round-trip on top of the request.
    const dialog = page.getByRole("dialog", { name: "Review the next build" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByText("One more build ran on this commit"),
    ).toBeVisible();
    // The row carries what the reviewer needs to choose: which build it is,
    // and where its review stands.
    await expect(
      dialog.getByRole("link", {
        name: `storybook Build ${storybookBuild.number} Changes detected`,
      }),
    ).toBeVisible();

    await screenshot(page, "build-next-review-dialog", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    await dialog
      .getByRole("link", { name: `Review ${storybookBuild.name}` })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/builds/${storybookBuild.number}/overview$`),
    );
    // The prompt belongs to the build it was raised on: it must not survive
    // the jump and keep pointing at the build the reviewer just left.
    await expect(dialog).toBeHidden();
  },
);

loggedTest(
  "header switches between the builds of a commit",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { defaultBuild, storybookBuild } = await createSiblingBuildsScenario({
      projectId: project.id,
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${defaultBuild.number}`,
    );
    await page.getByRole("button", { name: "Switch build" }).click();

    // Every build of the commit is listed with where its review stands, the
    // one being looked at included.
    const menu = page.getByRole("menu");
    await expect(
      menu.getByRole("menuitem", {
        name: `${defaultBuild.name} #${defaultBuild.number} Changes detected`,
      }),
    ).toBeVisible();
    const storybookItem = menu.getByRole("menuitem", {
      name: `${storybookBuild.name} #${storybookBuild.number} Changes detected`,
    });
    await expect(storybookItem).toBeVisible();

    await screenshot(page, "build-switcher", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    await storybookItem.click();
    await expect(page).toHaveURL(
      new RegExp(`/builds/${storybookBuild.number}/overview$`),
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
