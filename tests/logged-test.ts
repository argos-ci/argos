import { type Page } from "@playwright/test";

import { createSession } from "../apps/backend/src/auth/session";
import {
  LOGGED_IN_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "../apps/backend/src/auth/session-cookie";
import argosConfig from "../apps/backend/src/config";
import type { Account, User } from "../apps/backend/src/database/models";
import { seedTest } from "./seed-test";

export const loggedTest = seedTest.extend<{
  page: Page;
  auth: { account: Account; user: User };
}>({
  auth: async ({ user }, use) => {
    await use(user);
  },
  page: async ({ page, auth }, use) => {
    // Create a real server-side session and set the session cookies, mirroring
    // what the backend does on login: the HttpOnly credential plus the
    // JS-readable hint the app uses to know it's logged in.
    const { rawToken } = await createSession({ userId: auth.user.id });
    const url = argosConfig.get("server.url");
    await page.context().addCookies([
      { name: SESSION_COOKIE_NAME, value: rawToken, url, httpOnly: true },
      { name: LOGGED_IN_COOKIE_NAME, value: "1", url, httpOnly: false },
    ]);
    await use(page);
  },
});
