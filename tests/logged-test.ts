import type { Page } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import type { Account } from "../apps/backend/src/database/models";
import { seedTest } from "./seed-test";

export const loggedTest = seedTest.extend<{ page: Page }, { account: Account }>(
  {
    account: [
      async ({ models }, use) => {
        const account = await models.Account.query()
          .findOne("slug", "gregberge")
          .throwIfNotFound();

        await use(account);
      },
      { scope: "worker" },
    ],
    page: async ({ page, account }, use) => {
      await page.context().addCookies([
        {
          name: "argos_jwt",
          value: createJWT({
            version: JWT_VERSION,
            account: {
              id: account.id,
              name: account.name,
              slug: account.slug,
            },
          }),
          url: argosConfig.get("server.url"),
        },
      ]);
      await use(page);
    },
  },
);
