import { type Page } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import { seedTest } from "./seed-test";

export const loggedTest = seedTest.extend<{
  page: Page;
}>({
  page: async ({ page, user }, use) => {
    await page.context().addCookies([
      {
        name: "argos_jwt",
        value: createJWT({
          version: JWT_VERSION,
          account: {
            id: user.account.id,
            name: user.account.name,
            slug: user.account.slug,
          },
        }),
        url: argosConfig.get("server.url"),
      },
    ]);
    await use(page);
  },
});
