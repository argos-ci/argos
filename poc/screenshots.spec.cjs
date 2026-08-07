/**
 * Drives the app against the seeded Flows POC data and captures the
 * deliverable screenshots:
 * - the build review sidebar grouped by flow (the feature's core),
 * - the flows gallery (one cover per flow),
 * - the flow view (vertical, variant switcher, step reordering).
 *
 * Run `NODE_ENV=test node poc/seed.mjs > poc/seed-output.json` first.
 * Screenshots land in poc/shots/.
 */
const fs = require("node:fs");
const path = require("node:path");

const { expect, test } = require("@playwright/test");

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seed-output.json"), "utf8"),
);
const IMAGES = path.join(__dirname, "images");
const OUT = path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });

const FLOWS_URL = `/${seed.accountSlug}/${seed.projectName}/flows`;
const CHECKOUT_FLOW = "checkout.spec.ts › complete a purchase";
const SIGNUP_FLOW = "signup.spec.ts › create an account";
const CHECKOUT_FLOW_URL = `${FLOWS_URL}/${encodeURIComponent(CHECKOUT_FLOW)}`;
const SIGNUP_FLOW_URL = `${FLOWS_URL}/${encodeURIComponent(SIGNUP_FLOW)}`;
const REVIEW_URL = `/${seed.accountSlug}/${seed.projectName}/builds/${seed.checkBuildNumber}/${seed.diffIds["checkout/payment"]}`;
const ORDER_STORAGE_KEY = `argos-flows-order:${seed.accountSlug}/${seed.projectName}`;
const CORRECT_ORDER = [
  "checkout/cart",
  "checkout/shipping",
  "checkout/payment",
  "checkout/review",
  "checkout/confirmation",
];

async function setup(
  context,
  { dark = false, presetOrder = false, flowGrouping = false } = {},
) {
  await context.addCookies([
    {
      name: "argos_session",
      value: seed.rawToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
    { name: "argos_logged_in", value: "1", domain: "localhost", path: "/" },
  ]);
  await context.route(/files\.argos-ci\.com\/test\//, async (route) => {
    const match = route
      .request()
      .url()
      .match(/\/test\/(flowpoc-[a-z0-9.-]+\.png)/);
    const file = match && path.join(IMAGES, match[1]);
    if (file && fs.existsSync(file)) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: fs.readFileSync(file),
      });
    } else {
      await route.fulfill({ status: 404, body: "not found" });
    }
  });
  await context.addInitScript(
    ([dark, order, flowGrouping]) => {
      if (dark) {
        localStorage.theme = "dark";
      }
      if (order) {
        localStorage.setItem(order.key, order.value);
      }
      if (flowGrouping) {
        localStorage.setItem("preferences.build.sidebar-grouping", "flow");
      }
    },
    [
      dark,
      presetOrder
        ? {
            key: ORDER_STORAGE_KEY,
            value: JSON.stringify({ [CHECKOUT_FLOW]: CORRECT_ORDER }),
          }
        : null,
      flowGrouping,
    ],
  );
}

async function waitForImages(page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const images = Array.from(document.images);
          return (
            images.length > 0 &&
            images.every((img) => img.complete && img.naturalWidth > 0)
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
}

async function getStepOrder(page) {
  return page
    .locator("[data-flow-step]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-flow-step")),
    );
}

test("build review — sidebar grouped by flow", async ({ context, page }) => {
  await setup(context, { presetOrder: true });
  await page.goto(REVIEW_URL);
  await expect(page.getByText("checkout/payment").first()).toBeVisible();

  // Switch the sidebar from status groups to flow groups.
  await page.getByRole("button", { name: "Group by flow" }).click();
  const checkoutGroup = page.locator(
    `[data-flow-group=${JSON.stringify(CHECKOUT_FLOW)}]`,
  );
  await expect(checkoutGroup).toBeVisible();
  // The flow with changes sorts first; the other flows follow.
  await expect(page.locator("[data-flow-group]").first()).toHaveAttribute(
    "data-flow-group",
    CHECKOUT_FLOW,
  );

  // Untouched journeys start collapsed: their screenshots are hidden…
  const signupRow = page.getByText("signup/create-account vw-1280.png");
  await expect(signupRow).not.toBeVisible();
  // …and the keyboard navigation skips them: payment → review →
  // confirmation, then stays (remaining flows are collapsed).
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(
    new RegExp(`/${seed.diffIds["checkout/review"]}$`),
  );
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(
    new RegExp(`/${seed.diffIds["checkout/confirmation"]}$`),
  );
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(
    new RegExp(`/${seed.diffIds["checkout/confirmation"]}$`),
  );

  // A collapsed flow expands from its header.
  await page
    .locator(`[data-flow-group=${JSON.stringify(SIGNUP_FLOW)}]`)
    .getByRole("button")
    .click();
  await expect(signupRow).toBeVisible();
  await page
    .locator(`[data-flow-group=${JSON.stringify(SIGNUP_FLOW)}]`)
    .getByRole("button")
    .click();
  await expect(signupRow).not.toBeVisible();

  await page.mouse.move(760, 400);
  await page.screenshot({ path: path.join(OUT, "review-flow-light.png") });

  // The grouping preference survives a reload.
  await page.reload();
  await expect(checkoutGroup).toBeVisible();

  // The flow header links to the flow view.
  await page.getByRole("link", { name: "Open flow" }).first().click();
  await expect(page).toHaveURL(new RegExp("/flows/checkout"));
});

test("flows gallery — one cover per flow, variants collapsed", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  const cards = page.locator("[data-flow-card]");
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAttribute("data-flow-card", CHECKOUT_FLOW);
  // The signup flow has 6 screenshots but 3 logical steps in 2 variants.
  await expect(
    page.locator(`[data-flow-card=${JSON.stringify(SIGNUP_FLOW)}]`),
  ).toContainText("3 steps · 2 variants");
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-gallery-light.png") });
});

test("flow view — capture order and variant switcher", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(SIGNUP_FLOW_URL);
  await expect(
    page.getByRole("heading", { name: "create an account" }),
  ).toBeVisible();
  // The SDK capture index orders steps: "all-done" is alphabetically first
  // but captured last.
  expect(await getStepOrder(page)).toEqual([
    "signup/create-account",
    "signup/verify-email",
    "signup/all-done",
  ]);
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flow-signup-desktop.png") });

  // Switch to the mobile variant: same journey, other screenshots.
  await page.getByRole("radio", { name: "414px" }).click();
  await expect(page.getByRole("radio", { name: "414px" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flow-signup-mobile.png") });
});

test("flow view — manual reordering, persisted", async ({ context, page }) => {
  await setup(context);
  await page.goto(CHECKOUT_FLOW_URL);
  await expect(
    page.getByRole("heading", { name: "complete a purchase" }),
  ).toBeVisible();
  // No capture index on this flow: alphabetical default, confirmation 2nd.
  await expect
    .poll(() => getStepOrder(page))
    .toEqual([
      "checkout/cart",
      "checkout/confirmation",
      "checkout/payment",
      "checkout/review",
      "checkout/shipping",
    ]);
  await waitForImages(page);

  const moveUp = (step) =>
    page
      .locator(`[data-flow-step=${JSON.stringify(step)}]`)
      .getByRole("button", { name: "Move up" })
      .click();
  const moveDown = (step) =>
    page
      .locator(`[data-flow-step=${JSON.stringify(step)}]`)
      .getByRole("button", { name: "Move down" })
      .click();

  await moveUp("checkout/shipping");
  await moveUp("checkout/shipping");
  await moveUp("checkout/shipping");
  await moveDown("checkout/confirmation");
  await moveDown("checkout/confirmation");

  await expect.poll(() => getStepOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByText("Custom order")).toBeVisible();
  await page.screenshot({
    path: path.join(OUT, "flow-checkout-ordered.png"),
  });

  // The order survives a reload (persisted per project + flow).
  await page.reload();
  await expect.poll(() => getStepOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
});

test("fallback: no reference build, storybook grouping", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(`/${seed.accountSlug}/dashboard/flows`);
  await expect(page.getByText("From build #1 on feat/new-nav")).toBeVisible();
  const cards = page.locator("[data-flow-card]");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveAttribute(
    "data-flow-card",
    "storybook › signup-form",
  );
});

test("dark — review grouped by flow and gallery", async ({ context, page }) => {
  await setup(context, { dark: true, presetOrder: true, flowGrouping: true });
  await page.goto(REVIEW_URL);
  await expect(
    page.locator(`[data-flow-group=${JSON.stringify(CHECKOUT_FLOW)}]`),
  ).toBeVisible();
  await page.screenshot({ path: path.join(OUT, "review-flow-dark.png") });

  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-gallery-dark.png") });
});
