import { expect, type Page } from "@playwright/test";

import { createJourneyScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { screenshot, waitForDiffListToSettle } from "./util";

async function pickDisplayOption(page: Page, name: string) {
  await page.getByRole("button", { name: "Display options" }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

loggedTest(
  "lists the snapshots by test, as screenshots or names",
  async ({ page, team, project }) => {
    const { build } = await createJourneyScenario({ projectId: project.id });
    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    const list = page.getByTestId("diff-list-scroller");
    const rows = list.locator("[role='button'][data-index]");
    await expect(
      rows.filter({ hasText: "checkout/payment.png" }),
    ).toBeVisible();
    await rows.filter({ hasText: "checkout/payment.png" }).click();
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();

    await pickDisplayOption(page, "Test");
    // Both tests changed, so they come by name; each one's snapshots in the
    // order the test took them, the unchanged ones among them.
    await expect(list.getByRole("button")).toContainText([
      "shows the account settings",
      "account/settings.png",
      "complete a purchase",
      "checkout/cart.png",
      "checkout/shipping.png",
      "checkout/payment.png",
      "checkout/confirmation.png",
    ]);

    await pickDisplayOption(page, "Names");
    // Regrouping and the switch to names kept the open snapshot the current
    // row, and on screen.
    const current = list.locator("[aria-current]");
    await expect(current).toHaveText("checkout/payment.png");
    await waitForDiffListToSettle(page);
    await expect(current).toBeInViewport();
    await screenshot(page, "build-snapshot-list-by-test", {
      replacements: { [team.account.slug]: "acme" },
    });

    // Both choices are the reader's, so they outlive the page.
    await page.reload();
    await expect(
      list.getByRole("button", { name: /^complete a purchase/ }),
    ).toBeVisible();
    await expect(current).toHaveText("checkout/payment.png");
    await expect(current).toBeInViewport();

    // A test can be closed like any section.
    await list.getByRole("button", { name: /^complete a purchase/ }).click();
    await expect(rows.filter({ hasText: "checkout/cart.png" })).toHaveCount(0);

    // Back to cards, the open snapshot is the third of its section, below the
    // fold of a list scrolled to the top: it is only on screen if the switch
    // brought it there.
    await pickDisplayOption(page, "Status");
    await pickDisplayOption(page, "Screenshots");
    await expect(list.getByRole("button", { name: /^Changed/ })).toBeVisible();
    await waitForDiffListToSettle(page);
    await expect(current).toHaveText("checkout/payment.png");
    await expect(current).toBeInViewport();
  },
);
