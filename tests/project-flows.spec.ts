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
      page.getByText("8 tests ran in the reference build", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("5 of them took at least one screenshot", {
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

    // A row is not a link: the journey is reached from the screens, which name
    // it when it spans more than one test — so the three rows of the loan spec
    // visibly point at the same place instead of silently doing so.
    await expect(
      page.getByRole("link", { name: /See the supplier-invoice journey/ }),
    ).toHaveCount(3);

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
    await page
      .getByRole("link", { name: /See the supplier-invoice journey/ })
      .first()
      .click();

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
    expect(page.url()).toMatch(/\/flows\/\d+$/);
    await screenshot(page, "project-flow-journey");
  },
);

loggedTest(
  "shows a journey walked by a single test",
  async ({ page, team, project }) => {
    await createFlowsScenario({ projectId: project.id });

    await page.goto(`/${team.account.slug}/${project.name}/flows`);
    await page
      .getByRole("link", { name: /See the receivable-invoice journey/ })
      .click();

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
