/**
 * Drives the app against the seeded Flows POC data and captures the
 * deliverable screenshots: flows derived from test titlePath, default
 * (alphabetical, wrong) order, then manual reordering by drag & drop,
 * persisted across reloads.
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

function checkoutSteps(page) {
  return page.locator(
    `[data-flow-strip=${JSON.stringify(CHECKOUT_FLOW)}] [data-flow-step]`,
  );
}

async function getCheckoutOrder(page) {
  return checkoutSteps(page).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-flow-step")),
  );
}

test("flows tab — automatic flows, default alphabetical order", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  // Three flows derived from test titlePath, including the 1-step settings one.
  await expect(page.getByText("complete a purchase")).toBeVisible();
  await expect(page.getByText("create an account")).toBeVisible();
  await expect(page.getByText("update notifications")).toBeVisible();
  // Default order is alphabetical: confirmation lands in 2nd position.
  expect(await getCheckoutOrder(page)).toEqual([
    "checkout/cart",
    "checkout/confirmation",
    "checkout/payment",
    "checkout/review",
    "checkout/shipping",
  ]);
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-default-light.png") });
});

test("reorder steps by drag & drop, persisted across reloads", async ({
  context,
  page,
}) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await waitForImages(page);

  const strip = page.locator(
    `[data-flow-strip=${JSON.stringify(CHECKOUT_FLOW)}]`,
  );
  const stepCard = (name) =>
    page.locator(`[data-flow-step=${JSON.stringify(name)}]`);

  // Move "confirmation" to the end: drop on the strip's empty right area.
  const stripBox = await strip.boundingBox();
  await page.dragAndDrop(
    `[data-flow-step="checkout/confirmation"]`,
    `[data-flow-strip=${JSON.stringify(CHECKOUT_FLOW)}]`,
    { targetPosition: { x: stripBox.width - 15, y: stripBox.height / 2 } },
  );
  // Move "shipping" before "payment".
  await page.dragAndDrop(
    `[data-flow-step="checkout/shipping"]`,
    `[data-flow-step="checkout/payment"]`,
  );

  await expect.poll(() => getCheckoutOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByText("Custom order")).toBeVisible();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(OUT, "flows-ordered-light.png") });

  // The order survives a reload (persisted per project + flow).
  await page.reload();
  await waitForImages(page);
  await expect.poll(() => getCheckoutOrder(page)).toEqual(CORRECT_ORDER);
  await expect(page.getByText("Custom order")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();

  await expect(stepCard("checkout/cart")).toBeVisible();
});

test("flows tab — dark, with curated order", async ({ context, page }) => {
  await setup(context, { dark: true, presetOrder: true });
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await expect.poll(() => getCheckoutOrder(page)).toEqual(CORRECT_ORDER);
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-dark.png") });
});
