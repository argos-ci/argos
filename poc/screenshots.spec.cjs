/**
 * Drives the app against the seeded Flows POC data and captures the
 * deliverable screenshots (Flows tab + build review filmstrip, light/dark).
 *
 * Run `NODE_ENV=test node ../../poc/seed.mjs > poc/seed-output.json` first.
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
const REVIEW_URL = `/${seed.accountSlug}/${seed.projectName}/builds/${seed.checkBuildNumber}/${seed.diffIds["checkout/payment"]}`;

async function setup(context, { dark = false } = {}) {
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
  if (dark) {
    await context.addInitScript(() => {
      localStorage.theme = "dark";
    });
  }
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

test("flows tab — light", async ({ context, page }) => {
  await setup(context);
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await expect(page.getByText("Checkout")).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-light.png") });
});

test("flows tab — dark", async ({ context, page }) => {
  await setup(context, { dark: true });
  await page.goto(FLOWS_URL);
  await expect(page.getByRole("heading", { name: "Flows" })).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "flows-dark.png") });
});

test("build review filmstrip — light", async ({ context, page }) => {
  await setup(context);
  await page.goto(REVIEW_URL);
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "review-light.png") });

  // The strip navigates: clicking the Confirmation step activates its diff.
  await page.getByRole("button", { name: "5 · Confirmation" }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/builds/${seed.checkBuildNumber}/${seed.diffIds["checkout/confirmation"]}$`,
    ),
  );
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  await waitForImages(page);
  await page.screenshot({
    path: path.join(OUT, "review-confirmation-light.png"),
  });
});

test("build review filmstrip — dark", async ({ context, page }) => {
  await setup(context, { dark: true });
  await page.goto(REVIEW_URL);
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await waitForImages(page);
  await page.screenshot({ path: path.join(OUT, "review-dark.png") });
});
