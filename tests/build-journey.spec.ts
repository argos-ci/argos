import { expect } from "@playwright/test";

import {
  createJourneyScenario,
  createJourneysScenario,
} from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { ensureTeamOwner, screenshot, waitForDiffListToSettle } from "./util";

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

    // The label is cut to fit, so it hands the whole key over on hover; the
    // dot has no legend anywhere, so it explains itself.
    // Base UI portals its tooltip out of the trigger and gives the box
    // `role="presentation"`, so the portal is what there is to assert on.
    const tooltip = page.locator("[data-base-ui-portal]");
    await expect(async () => {
      await page.mouse.move(0, 0);
      await drawer.getByText("2 · shipping").hover();
      await expect(tooltip).toHaveText("checkout/shipping", { timeout: 2_000 });
    }).toPass();
    await expect(async () => {
      await page.mouse.move(0, 0);
      await drawer.getByTestId("journey-step-attention").first().hover();
      await expect(tooltip).toHaveText("Needs review: Changed", {
        timeout: 2_000,
      });
    }).toPass();
    await page.mouse.move(0, 0);

    // Jumping to a step opens it, unchanged included.
    await drawer.getByRole("button", { name: "1 · cart" }).click();
    await expect(
      page.getByRole("heading", { name: "checkout/cart.png" }),
    ).toBeVisible();
    await expect(drawer.locator("[aria-current='step']")).toHaveText(
      "1 · cart",
    );
    // Each jump scrolls the snapshot list to the step, and the next jump reads
    // that scroll to decide whether it has to move at all. Settle between them
    // or the walk below rests wherever the animation happened to be.
    await waitForDiffListToSettle(page);

    // ⇧→ walks to the next step, ⇧← back — across status sections.
    await page.keyboard.press("Shift+ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/shipping.png" }),
    ).toBeVisible();
    await waitForDiffListToSettle(page);
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(
      page.getByRole("heading", { name: "checkout/cart.png" }),
    ).toBeVisible();
    await waitForDiffListToSettle(page);

    await screenshot(page, "build-journey-drawer", {
      replacements: {
        [team.account.slug]: "acme",
      },
    });

    // The click above left focus in the strip, and from there plain ← / →
    // walk it instead. Focus goes along, so the next arrow starts from the
    // step on screen.
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/shipping.png" }),
    ).toBeVisible();
    await waitForDiffListToSettle(page);
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();
    await waitForDiffListToSettle(page);
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "checkout/confirmation.png" }),
    ).toBeVisible();
    await waitForDiffListToSettle(page);
    await page.keyboard.press("ArrowLeft");
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();
    const payment = drawer.getByRole("button", { name: "3 · payment" });
    await expect(payment).toBeFocused();
    await waitForDiffListToSettle(page);
    // Read once the list has settled, long after the build hotkeys would have
    // run had the ← reached them: they would have shown the baseline.
    const baseline = page.getByRole("button", {
      name: "Baseline",
      exact: true,
    });
    await expect(baseline).toHaveAttribute("aria-pressed", "false");

    // Out of the strip, ← / → switch the view mode again and the step stays.
    await payment.blur();
    const changes = page.getByRole("button", { name: "Changes", exact: true });
    await page.keyboard.press("ArrowLeft");
    await expect(baseline).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowRight");
    await expect(changes).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();

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

loggedTest(
  "walks the journey on screen when a step is marked",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createJourneyScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );
    await expect(
      page.getByRole("button", { name: "checkout/confirmation.png" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^(Start review|Browse snapshots)/ })
      .click();

    // The list goes confirmation, the account settings test, payment; the
    // journey puts payment before confirmation.
    const confirmationHeading = page.getByRole("heading", {
      name: "checkout/confirmation.png",
    });
    const settingsHeading = page.getByRole("heading", {
      name: "account/settings.png",
    });
    await expect(confirmationHeading).toBeVisible();

    // With the journey closed, nothing on screen says the review follows it:
    // marking moves down the list.
    await page.keyboard.press("y");
    await expect(settingsHeading).toBeVisible();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(confirmationHeading).toBeVisible();

    // With it open, marking moves on to the step still to review, from the
    // last step back to the ones before it.
    await page.getByRole("button", { name: "Journey" }).click();
    await page.keyboard.press("y");
    await expect(
      page.getByRole("heading", { name: "checkout/payment.png" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("journey-drawer").locator("[aria-current='step']"),
    ).toHaveText("3 · payment");

    // Cart and shipping did not change, so the journey is reviewed: the review
    // goes back to the diff it jumped over, which the list now has above.
    await page.keyboard.press("y");
    await expect(settingsHeading).toBeVisible();
  },
);

loggedTest(
  "walks a journey screen by screen from the build overview",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createJourneysScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );

    // The checkout, run on desktop and on mobile, has the most changes: it
    // comes first, a row per run. The sign-up changed nothing and waits behind
    // a button; the home page test captures a single screen, no journey.
    const walkLink = (title: string) =>
      page.getByRole("link", { name: new RegExp(`^Walk “${title}”`) });
    const runRow = (title: string) =>
      page
        .getByRole("listitem")
        .filter({ has: walkLink(title), hasNot: page.getByRole("heading") });
    await expect(runRow("complete a purchase")).toHaveText([
      /375×812.*Chromium/,
      /1280×720.*Chromium/,
    ]);
    // Journeys come by file, as a pull request shows them, each file with
    // the build's review progress for its changed screens.
    const checkoutFile = page.getByRole("listitem").filter({
      has: page.getByRole("heading", {
        level: 3,
        name: "e2e/checkout.spec.ts",
        exact: true,
      }),
    });
    await expect(checkoutFile).toContainText(/0 \/ \d+ reviewed/);
    await expect(walkLink("complete a purchase").first()).toHaveAccessibleName(
      /375×812/,
    );
    // The search takes each screen at two sizes in a single run (Argos's
    // `viewports` option): a run per size all the same, smallest first.
    await expect(runRow("finds a product")).toHaveText([/375×667/, /1280×720/]);
    await expect(walkLink("finds a product").first()).toHaveAccessibleName(
      /375×667/,
    );
    await expect(walkLink("create an account")).toHaveCount(0);
    await page.locator("summary", { hasText: "Unchanged journeys" }).click();
    await expect(runRow("create an account")).toHaveText(/1280×720/);
    // Apart from the journeys to review, and marked as having no changes.
    await expect(
      runRow("create an account").getByRole("img", {
        name: "No changes in this journey",
      }),
    ).toBeVisible();
    await expect(walkLink("shows the home page")).toHaveCount(0);
    // A test of a single screen is no journey: the affected tests name it,
    // and only it, the journeys being named above.
    const affectedTests = page.getByRole("list").filter({
      has: page.getByText("home.spec.ts › shows the home page"),
    });
    await expect(affectedTests.getByRole("listitem")).toHaveCount(1);

    // Opening the unchanged journeys scrolled the page: the capture starts at
    // the section's heading.
    await page
      .getByRole("heading", { name: "Journeys", exact: true })
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await screenshot(page, "build-overview-journeys", {
      replacements: { [team.account.slug]: "acme" },
    });

    // A run opens its journey on the first screen, unchanged as it is, with a
    // short id in the URL, the journey above the list and the strip open.
    await page
      .getByRole("link", { name: "Walk “complete a purchase” at 1280×720" })
      .click();
    const heading = (name: string) =>
      page.getByRole("heading", { name: `desktop/checkout/${name}.png` });
    await expect(heading("cart")).toBeVisible();
    await expect(page).toHaveURL(/[?&]journey=[0-9a-f]{8}(&|$)/);
    // The walk stops at its first screen: up does not leave it for the
    // overview, as it does from the first snapshot of the list.
    await expect(page.locator("button:has(.lucide-arrow-up)")).toBeDisabled();
    await page.keyboard.press("ArrowUp");
    await expect(heading("cart")).toBeVisible();
    await expect(page).toHaveURL(/[?&]journey=[0-9a-f]{8}(&|$)/);
    const journeyHeader = page.getByRole("region", {
      name: "Journey",
      exact: true,
    });
    await expect(journeyHeader).toContainText("complete a purchase");
    await expect(journeyHeader).toContainText("1280×720");
    const drawer = page.getByTestId("journey-drawer");
    // The strip stays open while the journey is walked: nothing to toggle.
    const journeyToggle = page.getByRole("button", {
      name: "Journey",
      exact: true,
    });
    await expect(drawer.getByRole("button")).toHaveText([
      "1 · cart",
      "2 · shipping",
      "3 · payment",
      "4 · confirmation",
    ]);
    await expect(journeyToggle).toHaveCount(0);

    // The list is the journey: its screens in the order the test walked them,
    // in one section, not sorted by status.
    const rows = page.locator("[role='button'][data-index]");
    await expect(rows).toHaveText([
      /1 · cart/,
      /2 · shipping/,
      /3 · payment/,
      /4 · confirmation/,
    ]);
    await waitForDiffListToSettle(page);
    await screenshot(page, "build-journey-walk", {
      replacements: { [team.account.slug]: "acme" },
    });

    // ↓ goes to the next screen, and marking one moves on to the next screen
    // too, changed or not: the walk does not skip the payment.
    await page.keyboard.press("ArrowDown");
    await expect(heading("shipping")).toBeVisible();
    await page.keyboard.press("y");
    await expect(heading("payment")).toBeVisible();
    // A reviewed screen keeps its place in the journey.
    await expect(rows.nth(1)).toHaveText(/2 · shipping/);

    // The journey is in the URL, so a reload keeps walking it.
    await page.reload();
    await expect(heading("payment")).toBeVisible();
    await expect(journeyHeader).toContainText("complete a purchase");

    // Closing the journey goes back to the overview, at the journey, to pick
    // another one.
    await page.getByRole("link", { name: "Back to the overview" }).click();
    await expect(page).not.toHaveURL(/[?&]journey=/);
    await expect(page).toHaveURL(/#journey-[0-9a-f]{8}$/);
    await expect(
      page.getByRole("link", {
        name: "Walk “complete a purchase” at 1280×720",
      }),
    ).toBeInViewport();
    // A run says it changed until its review is done, and how far it got.
    await expect(
      page.getByRole("img", { name: "Changed, 1 of 2 reviewed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Changed, not reviewed yet" }).first(),
    ).toBeVisible();
    await expect(journeyHeader).toHaveCount(0);
    await expect(walkLink("complete a purchase").first()).toBeVisible();

    // Once every changed screen of a run is marked, its card says so.
    const reviewed = page.getByRole("img", {
      name: "Reviewed, every screen accepted",
    });
    await expect(reviewed).toHaveCount(0);
    await page
      .getByRole("link", { name: "Screen 4, confirmation, changed" })
      .click();
    await expect(
      page.getByRole("heading", { name: "mobile/checkout/confirmation.png" }),
    ).toBeVisible();
    await page.keyboard.press("y");
    await page.getByRole("link", { name: "Back to the overview" }).click();
    await expect(reviewed).toHaveCount(1);
  },
);

loggedTest(
  "shows the journeys of an auto-approved build as approved",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createJourneysScenario({
      projectId: project.id,
      type: "reference",
    });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );

    // Nobody reviews a build of an auto-approved branch: its changed runs
    // say they were approved with it, none waits for a review.
    await expect(
      page
        .getByRole("img", { name: "Changed, auto-approved with the build" })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /^Changed, not reviewed yet/ }),
    ).toHaveCount(0);
  },
);

loggedTest(
  "picks a journey from the filters and moves on from the walk header",
  async ({ page, auth, team, project }) => {
    await ensureTeamOwner({ team: team.team, user: auth.user });
    const { build } = await createJourneysScenario({ projectId: project.id });

    await page.goto(
      `/${team.account.slug}/${project.name}/builds/${build.number}`,
    );

    // The journey filter lists the tests by file, a row per test with its
    // runs together, and narrows the list to the one picked.
    await page.locator("button:has(.lucide-filter)").click();
    await page.getByRole("option", { name: "Journey" }).click();
    await expect(
      page.locator("[role='listbox']").getByText("e2e/checkout.spec.ts"),
    ).toBeVisible();
    const purchase = page.getByRole("option", {
      name: /^complete a purchase/,
    });
    await expect(purchase).toContainText("375×812, 1280×720");
    await purchase.click();
    const journeyHeader = page.getByRole("region", {
      name: "Journey",
      exact: true,
    });
    await expect(journeyHeader).toContainText("complete a purchase");
    // The walk starts on the journey's first screen, wherever the review was.
    await expect(
      page.getByRole("heading", { name: "desktop/checkout/cart.png" }),
    ).toBeVisible();
    // The overview's order: the most changed first, the unchanged one last.
    await expect(journeyHeader).toContainText("Journey 1 of 3");

    // On to the next journey, from its first screen.
    await journeyHeader.getByRole("link", { name: "Next journey" }).click();
    await expect(journeyHeader).toContainText("finds a product");
    await expect(journeyHeader).toContainText("Journey 2 of 3");
    await expect(page).toHaveURL(/[?&]journey=[0-9a-f]{8}(&|$)/);

    // Or to any journey, from the title.
    await journeyHeader
      .getByRole("button", { name: "finds a product" })
      .click();
    await page.getByRole("option", { name: /^complete a purchase/ }).click();
    await expect(journeyHeader).toContainText("Journey 1 of 3");

    // A test run in two projects switches runs on the same screen.
    await journeyHeader.getByRole("link", { name: "375×812" }).click();
    await expect(
      page.getByRole("heading", { name: "mobile/checkout/cart.png" }),
    ).toBeVisible();
    await expect(
      journeyHeader.getByRole("link", { name: "375×812" }),
    ).toHaveAttribute("aria-current", "true");

    // The walk sets the list's order: the display options offer no grouping.
    await page.getByRole("button", { name: "Display options" }).click();
    await expect(
      page.getByRole("option", { name: "Names", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Status", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", { name: "Test", exact: true }),
    ).toHaveCount(0);
  },
);

loggedTest(
  "keeps each build's journeys when going from one build to another",
  async ({ page, team, project }) => {
    // Two builds of the same tests: their journeys share their ids.
    await createJourneysScenario({ projectId: project.id, number: 1 });
    await createJourneysScenario({ projectId: project.id, number: 2 });
    const buildLink = (number: number) =>
      page.locator(`a[href$="/builds/${number}"]`);
    const walkLink = page.getByRole("link", {
      name: "Walk “complete a purchase” at 1280×720",
    });

    // Moving between the builds in the app keeps what the first one loaded.
    await page.goto(`/${team.account.slug}/${project.name}`);
    await buildLink(1).click();
    await expect(walkLink).toBeVisible();
    await page.goBack();
    await buildLink(2).click();
    await expect(walkLink).toBeVisible();
    await page.goBack();
    await buildLink(1).click();

    // Back on the first build, its journeys still lead to its own screens.
    await walkLink.click();
    await expect(
      page.getByRole("heading", { name: "desktop/checkout/cart.png" }),
    ).toBeVisible();
    await expect(page.locator("[role='button'][data-index]")).toHaveCount(4);
  },
);
