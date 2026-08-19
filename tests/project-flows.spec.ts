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
      page.getByText("the ones that capture nothing included", {
        exact: false,
      }),
    ).toBeVisible();

    // Grouped by spec file, in declaration order.
    await expect(page.getByText("e2e/auth-guard.spec.ts")).toBeVisible();
    await expect(page.getByText("e2e/logged/post-loan.spec.ts")).toBeVisible();
    await expect(
      page.getByText("sends a signed-out visitor to /login"),
    ).toBeVisible();
    await expect(
      page.getByText("does not bounce a signed-in user via /login"),
    ).toBeVisible();

    // The journey is named and linked once, above the tests that share it —
    // not repeated down every row, where it would say nothing new.
    const journeyLink = page.getByRole("link", { name: "supplier-invoice" });
    await expect(journeyLink).toHaveCount(1);
    await expect(
      page.getByText("6 screens across 3 tests", { exact: false }),
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
    // The only select on the page; its trigger shows the current value, like
    // every other select in the app.
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Without screenshots" }).click();

    await expect(
      page.getByText("does not bounce a signed-in user via /login"),
    ).toBeVisible();
    // The tests that do capture are gone.
    await expect(
      page.getByText("sends a signed-out visitor to /login"),
    ).toBeHidden();
    await expect(page.getByText("uploads the supplier invoice")).toBeHidden();

    // The filter is in the URL, so the view survives a reload and can be shared.
    await expect(page).toHaveURL(/screens=without/);
  },
);

loggedTest(
  "shows a journey walked across several tests",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    // Any test of the journey opens the whole journey, not just its own share
    // of it — which is the point: a reader came for the path, not the test.
    await page.getByRole("link", { name: "supplier-invoice" }).click();

    await expect(
      page.getByRole("heading", { name: "supplier-invoice" }),
    ).toBeVisible();
    await expect(
      page.getByText("6 screens across 3 tests", { exact: false }),
    ).toBeVisible();

    // The three tests that contribute to it are named on the canvas, and the
    // screens carry their short names rather than the folder they share.
    for (const title of [
      "uploads the supplier invoice",
      "sets up the loan",
      "confirms the request",
    ]) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByText("loan-beneficiary", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("loan-pre-check", { exact: true }),
    ).toBeVisible();

    // The flow id lives in the URL, which the screenshot does not capture, so
    // nothing has to be masked here.
    expect(page.url()).toMatch(/\/flows\/\d+/);
    await screenshot(page, "project-flow-journey");
  },
);

loggedTest(
  "shows a journey walked by a single test",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page.getByRole("link", { name: "receivable-invoice" }).click();

    await expect(
      page.getByRole("heading", { name: "receivable-invoice" }),
    ).toBeVisible();
    await expect(page.getByText("3 screens", { exact: false })).toBeVisible();
  },
);

loggedTest(
  "says so when a test captures nothing at all",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    // A test that captures nothing has no link on its row — there is nothing to
    // look at — so the page is reached by its address.
    const { Flow } = await import("../apps/backend/src/database/models");
    const flow = await Flow.query().findOne({
      projectId: project.id,
      title: "does not bounce a signed-in user via /login",
    });
    if (!flow) {
      throw new Error("the scenario seeds this test");
    }

    await page.goto(`/${team.account.slug}/${project.name}/flows/${flow.id}`);

    await expect(
      page.getByText("This test takes no screenshot", { exact: false }),
    ).toBeVisible();
  },
);

loggedTest(
  "folds the viewports of a screen into one step, and switches between them",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page.getByRole("link", { name: "supplier-invoice" }).click();

    // Six screens, not twelve: a screen captured at two viewports is one step
    // of the journey seen twice.
    await expect(
      page.getByText("6 screens across 3 tests", { exact: false }),
    ).toBeVisible();

    // The widest viewport opens first, being the one that covers every step.
    const viewport = page.getByRole("combobox", { name: "Viewport" });
    await expect(viewport).toContainText("1280 px");
    await expect(
      page.getByText("loan-pre-check", { exact: true }),
    ).toBeVisible();

    await viewport.click();
    await page.getByRole("option", { name: "414 px" }).click();

    // The step the mobile run skips keeps its place, and says why it is empty.
    await expect(page.getByText("Not captured at 414 px")).toBeVisible();
    // And the choice is in the URL, so the link can be sent as it is read.
    await expect(page).toHaveURL(/viewport=414/);

    await screenshot(page, "project-flow-journey-mobile");
  },
);
