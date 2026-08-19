import { expect } from "@playwright/test";

import { createFlowScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest(
  "flows: the journeys a project's tests walk, and how a build changes one",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createFlowScenario({ projectId: project.id });

    // The gallery lists the journeys detected on the latest build (there is
    // no reference build yet), one card per test that walked several screens.
    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
    const card = page.locator("[data-flow-card]");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("complete a purchase");
    await expect(card).toContainText("4 steps");
    await screenshot(page, "project-flows");

    // The flow reads as the build walked it, the two changed steps carrying
    // their baseline below them.
    await card.click();
    await expect(
      page.getByRole("heading", { name: "complete a purchase" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/flows\/.+\?build=1$/);
    const steps = page.locator("[data-flow-step]");
    await expect(steps).toHaveText([
      /1 · cart/,
      /2 · shipping/,
      /3 · payment.*Changed.*before · main/s,
      /4 · confirmation.*Changed.*before · main/s,
    ]);
    await expect(
      steps.filter({ has: page.locator("img") }).locator("img"),
    ).toHaveCount(6);
    await expect(page.getByText("4 steps · 2 changes")).toBeVisible();
    await screenshot(page, "project-flow-canvas");

    // Only changes folds the unchanged steps.
    await page.getByRole("button", { name: "Only changes" }).click();
    await expect(
      page.locator("[data-flow-step-kind='unchanged'] .object-cover"),
    ).toHaveCount(2);
    await screenshot(page, "project-flow-canvas-only-changes");

    // A step opens in the build review.
    await page.locator("[data-flow-step='checkout/payment'] a").first().click();
    await expect(page).toHaveURL(new RegExp(`/builds/${build.number}/\\d+$`));
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();

    // And the review links back to the flow, on this build.
    const flowChip = page.getByRole("link", { name: /complete a purchase/ });
    await expect(flowChip).toHaveAttribute("href", /\/flows\/.+\?build=1$/);
  },
);
