/* eslint-disable no-empty-pattern */
import { test, type Page } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import { Account, type User } from "../apps/backend/src/database/models";
import { createUser } from "../apps/backend/src/database/seeds";

export const loggedTest = test.extend<
  {
    page: Page;
  },
  {
    auth: { account: Account; user: User };
  }
>({
  auth: [
    async ({}, use, workerInfo) => {
      const seedUser = await createUser({
        email: `greg-${workerInfo.workerIndex}@argos-ci.com`,
        name: "Greg Bergé",
        slug: `gregberge-${workerInfo.workerIndex}`,
      });
      await use(seedUser);
    },
    { scope: "worker" },
  ],
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
