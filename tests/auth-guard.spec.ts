import { expect, type Page } from "@playwright/test";

import { loggedTest } from "./logged-test";
import { seedTest } from "./seed-test";

/**
 * Routes wrapped in `AuthGuard`, which redirects to `/login` when there is no
 * viewer.
 *
 * The app renders before `me` resolves, so the guard has to distinguish "nobody
 * is logged in" from "we do not know yet". When it did not, every one of these
 * bounced a signed-in user through `/login` — landing them somewhere other than
 * the page they asked for, which is how the staff specs started failing.
 */
const GUARDED_PATHS = ["/", "/new", "/teams/new", "/staff/teams"];

/**
 * Records every main-frame navigation, so a bounce stays visible even when the
 * chain recovers and ends somewhere plausible.
 */
function trackNavigations(page: Page): string[] {
  const paths: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      paths.push(new URL(frame.url()).pathname);
    }
  });
  return paths;
}

for (const path of GUARDED_PATHS) {
  loggedTest(
    `does not bounce a signed-in user via /login: ${path}`,
    async ({ page }) => {
      const navigations = trackNavigations(page);
      await page.goto(path);
      // The bug redirected on the first render, so a bounce is immediate — but
      // settle the network so `me` has certainly had time to land.
      await page.waitForLoadState("networkidle");

      // Asserted on the whole chain rather than the final URL: the old
      // behaviour still ended on a real page, because `/login` forwarded the
      // user to their account. Only the intermediate hop reveals it.
      expect(navigations.filter((navigated) => navigated === "/login")).toEqual(
        [],
      );
    },
  );
}

seedTest("sends a signed-out visitor to /login", async ({ page }) => {
  // The other half of the guard: with no session at all it must still redirect.
  await page.goto("/staff/teams");
  await page.waitForURL(/\/login/);
  expect(new URL(page.url()).pathname).toBe("/login");
});
