/**
 * Drives the app against the seeded Flows POC data and captures the
 * deliverable screenshots: a gallery of flows (one cover per flow) and a
 * dedicated flow view where steps are reordered by drag & drop, persisted
 * across reloads.
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
const CHECKOUT_FLOW_URL = `${FLOWS_URL}/${encodeURIComponent(CHECKOUT_FLOW)}`;
const ORDER_STORAGE_KEY = `argos-flows-order:${seed.accountSlug}/${seed.projectName}`;
const CORRECT_ORDER = [
  "checkout/cart",
  "checkout/shipping",
  "checkout/payment",
  "checkout/review",
  "checkout/confirmation",
];

async function setup(context, { dark = false, presetOrder = false } = {}) {
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
    ([dark, order]) => {
      if (dark) {
        localStorage.theme = "dark";
      }
      if (order) {
        localStorage.setItem(order.key, order.value);
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

test("gallery — one card per flow, journeys first", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  const cards = page.locator("[data-flow-card]");
  await expect(cards).toHaveCount(3);
  // Multi-step journeys sort before single-screenshot tests.
  await expect(cards.first()).toHaveAttribute("data-flow-card", CHECKOUT_FLOW);
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-gallery-light.png") });
});

test("flow view — default order, drag & drop, persistence", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await page
    .locator(`[data-flow-card=${JSON.stringify(CHECKOUT_FLOW)}]`)
    .click();
  await expect(page).toHaveURL(new RegExp("/flows/checkout"));
  await expect(
    page.getByRole("heading", { name: "complete a purchase" }),
  ).toBeVisible();
  // Default order is alphabetical: confirmation lands in 2nd position.
  expect(await getStepOrder(page)).toEqual([
    "checkout/cart",
    "checkout/confirmation",
    "checkout/payment",
    "checkout/review",
    "checkout/shipping",
  ]);
  await waitForImages(page);
  await page.screenshot({
    path: path.join(OUT, "flow-detail-default-light.png"),
  });

  // The storyboard wraps (no horizontal scroll), so every step and the
  // dedicated end-drop target are visible and draggable.
  // Move "confirmation" to the end…
  await page.dragAndDrop(
    `[data-flow-step="checkout/confirmation"]`,
    `[data-flow-strip=${JSON.stringify(CHECKOUT_FLOW)}] [data-flow-dropend]`,
  );
  // …then "shipping" before "payment".
  await page.dragAndDrop(
    `[data-flow-step="checkout/shipping"]`,
    `[data-flow-step="checkout/payment"]`,
  );

  await expect.poll(() => getStepOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByText("Custom order")).toBeVisible();
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(OUT, "flow-detail-ordered-light.png"),
  });

  // The order survives a reload (persisted per project + flow).
  await page.reload();
  await waitForImages(page);
  await expect.poll(() => getStepOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
});

test("fallback: no reference build, storybook grouping", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(`/${seed.accountSlug}/dashboard/flows`);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  // No reference build on this project: the page falls back to the latest
  // check build.
  await expect(page.getByText("From build #1 on feat/new-nav")).toBeVisible();
  // Storybook uploads have no test metadata: stories group by component,
  // and multi-step flows sort before single-screenshot ones.
  const cards = page.locator("[data-flow-card]");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveAttribute(
    "data-flow-card",
    "storybook › signup-form",
  );
  await waitForImages(page);
  await cards.first().click();
  await expect(
    page.getByRole("heading", { name: "signup-form" }),
  ).toBeVisible();
  await expect(page.locator("[data-flow-step]")).toHaveCount(3);
});

test("dark — gallery and flow view with curated order", async ({
  context,
  page,
}) => {
  await setup(context, { dark: true, presetOrder: true });
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-gallery-dark.png") });

  await page.goto(CHECKOUT_FLOW_URL);
  await expect.poll(() => getStepOrder(page)).toEqual(CORRECT_ORDER);
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flow-detail-dark.png") });
});
