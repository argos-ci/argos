import { expect } from "@playwright/test";

import { createFlowsScenario } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot } from "./util";

loggedTest.beforeEach(async ({ auth, team }) => {
  await ensureTeamOwner({ team: team.team, user: auth.user });
});

loggedTest(
  "lists every test of the reference build, captured or not",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();

    // The denominator is the whole point: a test that captures nothing is
    // listed, which is what tells it apart from a test Argos never heard of.
    await expect(
      page.getByText("5 tests ran in the reference build", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("2 of them took at least one screenshot", {
        exact: false,
      }),
    ).toBeVisible();

    // Grouped by spec file, in declaration order.
    await expect(page.getByText("tests/auth-guard.spec.ts")).toBeVisible();
    await expect(page.getByText("tests/settings.spec.ts")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /sends a signed-out visitor/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /does not bounce a signed-in user/ }),
    ).toBeVisible();

    // A skipped test carries the reason it was skipped, so the hole is
    // documented rather than mysterious.
    await expect(page.getByText("flaky on CI since 12/03")).toBeVisible();

    await screenshot(page, "project-flows");
  },
);

loggedTest(
  "narrows the list down to the tests that capture nothing",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page.getByRole("button", { name: "Without screenshots" }).click();

    await expect(
      page.getByRole("link", { name: /does not bounce a signed-in user/ }),
    ).toBeVisible();
    // The two tests that do capture are gone.
    await expect(
      page.getByRole("link", { name: /sends a signed-out visitor/ }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: /reviews a build/ }),
    ).toBeHidden();

    // The filter is in the URL, so the view survives a reload and can be shared.
    await expect(page).toHaveURL(/withoutScreenshots=true/);
  },
);

loggedTest(
  "opens a flow on its screens, in capture order",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page.getByRole("link", { name: /reviews a build/ }).click();

    await expect(
      page.getByRole("heading", { name: "reviews a build" }),
    ).toBeVisible();
    await expect(page.getByText("3 screens", { exact: false })).toBeVisible();

    // The screens are the ones the test captured, in the order it walked them.
    const names = await page
      .locator("figcaption span")
      .filter({ hasText: /reviews a build/ })
      .allInnerTexts();
    expect(names).toEqual([
      "reviews a build builds",
      "reviews a build build-overview",
      "reviews a build build-approved",
    ]);

    // The flow id lives in the URL, which the screenshot does not capture, so
    // nothing has to be masked here.
    expect(page.url()).toMatch(/\/flows\/\d+$/);
    await screenshot(page, "project-flow");
  },
);

loggedTest(
  "says so when a test captures nothing at all",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page
      .getByRole("link", { name: /does not bounce a signed-in user/ })
      .click();

    await expect(
      page.getByText("This test takes no screenshot", { exact: false }),
    ).toBeVisible();
  },
);
