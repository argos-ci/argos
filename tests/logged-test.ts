import { type Page } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import { Account, type User } from "../apps/backend/src/database/models";
import { seedTest } from "./seed-test";

export const loggedTest = seedTest.extend<{
  page: Page;
  auth: { account: Account; user: User };
}>({
  auth: async ({ user }, use) => {
    await use(user);
  },
  page: async ({ page, auth }, use) => {
    await page.context().addCookies([
      {
        name: "argos_jwt",
        value: createJWT({
          version: JWT_VERSION,
          account: {
            id: auth.account.id,
            name: auth.account.name,
            slug: auth.account.slug,
          },
        }),
        url: argosConfig.get("server.url"),
      },
    ]);
    await use(page);
  },
});
