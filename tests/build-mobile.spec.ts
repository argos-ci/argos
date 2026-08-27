import { expect } from "@playwright/test";

import { ScreenshotDiff } from "../apps/backend/src/database/models";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

/**
 * The build review below the `md` breakpoint: sidebars become sheets, the
 * actions live in a floating dock. Desktop behavior is covered by
 * `build.spec.ts`; this protects the mobile layout existing at all.
 */
loggedTest.describe("mobile build review", () => {
  loggedTest.use({ viewport: { width: 390, height: 844 } });

  loggedTest(
    "reviews a build from a phone-sized viewport",
    async ({ page, auth, team, project, builds }) => {
      await ensureTeamOwner({ team: team.team, user: auth.user });
      const number = builds.diffDetectedBuild.number;
      await page.goto(`/${team.account.slug}/${project.name}/builds/${number}`);
      await expect(page).toHaveURL(new RegExp(`/builds/${number}/overview$`));
      await screenshot(page, "build-mobile-overview", {
        replacements: { [team.account.slug]: "acme" },
      });

      // Straight to a changed snapshot: the build's first diffs are test
      // failures, which have no baseline to compare against.
      const changedDiff = await ScreenshotDiff.query()
        .where({ buildId: builds.diffDetectedBuild.id })
        .where("score", ">", 0)
        .orderBy("id")
        .first()
        .throwIfNotFound();
      await page.goto(
        `/${team.account.slug}/${project.name}/builds/${number}/${changedDiff.id}`,
      );

      // The dock replaces the desktop toolbars.
      const holdButton = page.getByRole("button", {
        name: "Hold to show baseline",
      });
      await expect(holdButton).toBeEnabled();
      // The desktop nav buttons carry no accessible name (tooltip only);
      // locate them by their lucide icon, as the desktop specs do.
      await expect(
        page.locator("button:has(.lucide-arrow-down)"),
      ).toBeVisible();
      await screenshot(page, "build-mobile-diff");

      // Holding BASE flips the pane to the baseline, releasing flips it back.
      await holdButton.hover();
      await page.mouse.down();
      await expect(page.getByText("Baseline", { exact: true })).toBeVisible();
      await page.mouse.up();
      await expect(page.getByText("Baseline", { exact: true })).toBeHidden();

      // The comparison tools unfold inside the dock.
      await page.getByRole("button", { name: "Tools" }).click();
      await expect(page.locator("button:has(.lucide-eye)")).toBeVisible();
      await screenshot(page, "build-mobile-tools");
      await page.getByRole("button", { name: "Tools" }).click();

      // The snapshots grid opens from the header title and closes by picking
      // another snapshot.
      await page.getByRole("button", { name: "Open snapshots list" }).click();
      const snapshotsSheet = page.getByRole("dialog", { name: "Snapshots" });
      await expect(snapshotsSheet).toBeVisible();
      await screenshot(page, "build-mobile-snapshots-sheet");
      await snapshotsSheet
        .getByRole("button", { name: "dummy-375x1440.png" })
        .click();
      await expect(snapshotsSheet).toBeHidden();

      // Info, Snapshot and Review land in one tabbed sheet.
      await page.getByRole("button", { name: "Build details" }).click();
      const panelsSheet = page.getByRole("dialog", { name: "Build details" });
      await expect(panelsSheet).toBeVisible();
      await expect(
        panelsSheet.getByRole("tab", { name: "Snapshot" }),
      ).toBeVisible();
      await screenshot(page, "build-mobile-panels-sheet");
      await panelsSheet.getByRole("tab", { name: "Info" }).click();
      await expect(panelsSheet.getByText("Baseline build")).toBeVisible();

      // A slow pull settles the sheet on its half snap; pulling again from
      // there closes it. Slow on purpose: a fast drag projects its velocity
      // and would close in one go.
      const handle = panelsSheet.getByRole("button", { name: "Close" });
      const dragHandleDown = async (distance: number) => {
        const box = await handle.boundingBox();
        if (!box) {
          throw new Error("sheet handle has no box");
        }
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        for (let step = 1; step <= 10; step++) {
          await page.mouse.move(x, y + (distance * step) / 10);
          await page.waitForTimeout(25);
        }
        await page.mouse.up();
        await page.waitForTimeout(400);
      };
      const fullBox = await handle.boundingBox();
      if (!fullBox) {
        throw new Error("sheet handle has no box");
      }
      await dragHandleDown(300);
      await expect(panelsSheet).toBeVisible();
      const halfBox = await handle.boundingBox();
      if (!halfBox) {
        throw new Error("sheet handle has no box");
      }
      expect(halfBox.y).toBeGreaterThan(fullBox.y + 150);
      await dragHandleDown(300);
      await expect(panelsSheet).toBeHidden();
    },
  );
});
