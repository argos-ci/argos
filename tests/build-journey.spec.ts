import { expect } from "@playwright/test";

import { createJourneyScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest(
  "reviews a change against the journey it happened in",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createJourneyScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    // The button is clickable before the diffs land, and then it has nothing
    // to open: wait for the list.
    await expect(
      page.getByRole("button", { name: "checkout/confirmation.png" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    // The review opens on the biggest change, which is the last step of the
    // purchase — so the journey is there to be opened, and its order is
    // already known not to be the score's.
    await expect(
      page.getByRole("heading", { name: "checkout/confirmation.png" }),
    ).toBeVisible();
    const toggle = page.getByRole("button", { name: "Journey" });
    await expect(toggle).toBeVisible();
    await toggle.click();

    // The whole journey, in the order the test walked it — which is neither
    // the alphabet (cart, confirmation, payment, shipping) nor the diff score
    // (confirmation, payment). Cart and shipping did not change and are in it
    // all the same: a change reads against the journey it happened in.
    const drawer = page.getByTestId("journey-drawer");
    await expect(drawer.getByRole("button")).toHaveText([
      "1 · cart",
      "2 · shipping",
      "3 · payment",
      "4 · confirmation",
    ]);

    // Jumping to a step opens it, unchanged included.
    await drawer.getByRole("button", { name: "1 · cart" }).click();
    await expect(
      page.getByRole("heading", { name: "checkout/cart.png" }),
    ).toBeVisible();
    await expect(drawer.locator("[aria-current='step']")).toHaveText(
      "1 · cart",
    );

    // ⇧→ walks to the next step, ⇧← back — across status sections.
    await page.keyboard.press("Shift+ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/shipping.png" }),
    ).toBeVisible();
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(
      page.getByRole("heading", { name: "checkout/cart.png" }),
    ).toBeVisible();

    await screenshot(page, "build-journey-drawer", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    // A test that captures a single screen is regular visual testing, not a
    // journey: nothing to open, and nothing offering to.
    await page
      .locator("[role='button'][data-index]")
      .filter({ hasText: "account/settings.png" })
      .click();
    await expect(
      page.getByRole("heading", { name: "account/settings.png" }),
    ).toBeVisible();
    await expect(page.getByTestId("journey-drawer")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Journey" })).toHaveCount(0);
  },
);
