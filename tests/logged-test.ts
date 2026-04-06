import type { Page } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import type { Account, User } from "../apps/backend/src/database/models";
import { seedTest } from "./seed-test";

export const loggedTest = seedTest.extend<
  { page: Page },
  { auth: { account: Account; user: User } }
>({
  auth: [
    async ({ models }, use) => {
      const account = await models.Account.query()
        .findOne("slug", "gregberge")
        .withGraphFetched("user")
        .throwIfNotFound();

      if (!account.user) {
        throw new Error("User not loaded");
      }

      await use({ account, user: account.user });
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

// function getSlugByIndex(index: number) {
//   switch (index) {
//     case 0:
//       return "gregberge";
//     case 1:
//       return "jsfez";
//     default:
//       throw new Error(`Unsupported worker index ${index}`);
//   }
// }
