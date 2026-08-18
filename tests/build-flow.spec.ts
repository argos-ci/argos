import { expect } from "@playwright/test";

import { createFlowScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest(
  "reviews the screenshots of a test in the order of its journey",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createFlowScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await page.getByRole("button", { name: /^Start review/ }).click();

    // The list follows the journey, not the alphabet nor the diff score:
    // payment (step 3) before confirmation (step 4), and the journey leads
    // since it holds the biggest change.
    const list = page.locator("[role='button'][data-index]");
    await expect(list).toHaveText([
      /checkout\/payment\.png/,
      /checkout\/confirmation\.png/,
      /account\/settings\.png/,
    ]);
    // Unchanged steps sit in their own section, still in journey order.
    await page.getByRole("button", { name: /^Unchanged/ }).click();
    await expect(list).toHaveText([
      /checkout\/payment\.png/,
      /checkout\/confirmation\.png/,
      /account\/settings\.png/,
      /checkout\/cart\.png/,
      /checkout\/shipping\.png/,
    ]);

    // The first change is the third step of the purchase, and the review
    // says so above the screenshot name and in the metadata.
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();
    const flowLine = page.getByTestId("flow-line");
    await expect(flowLine).toHaveText("complete a purchase · 3/4");
    await expect(
      page.getByText("complete a purchase · step 3/4"),
    ).toBeVisible();

    // ⇧→ walks to the next step, ⇧← back — across status sections.
    await page.keyboard.press("Shift+ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/confirmation.png" }),
    ).toBeVisible();
    await expect(flowLine).toHaveText("complete a purchase · 4/4");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(flowLine).toHaveText("complete a purchase · 3/4");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(
      page.getByRole("heading", { name: "checkout/shipping.png" }),
    ).toBeVisible();
    await expect(flowLine).toHaveText("complete a purchase · 2/4");

    // The minimap unfolds the whole journey, marks the current step and the
    // ones with changes, and jumps between steps.
    await page.getByRole("button", { name: "Flow minimap" }).click();
    const minimap = page.getByTestId("flow-minimap");
    await expect(minimap.getByRole("button")).toHaveText([
      "1 · cart",
      "2 · shipping",
      "3 · payment",
      "4 · confirmation",
    ]);
    await expect(minimap.locator("[aria-current='step']")).toHaveText(
      "2 · shipping",
    );
    await minimap.getByRole("button", { name: "4 · confirmation" }).click();
    await expect(
      page.getByRole("heading", { name: "checkout/confirmation.png" }),
    ).toBeVisible();

    await screenshot(page, "build-flow-context", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    // A screenshot outside any journey shows no flow context.
    await list.filter({ hasText: "account/settings.png" }).click();
    await expect(
      page.getByRole("heading", { name: "account/settings.png" }),
    ).toBeVisible();
    await expect(flowLine).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Flow minimap" }),
    ).toHaveCount(0);
  },
);
