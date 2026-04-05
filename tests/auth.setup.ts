import path from "node:path";
import { test as setup } from "@playwright/test";

import { createJWT, JWT_VERSION } from "../apps/backend/src/auth/jwt";
import argosConfig from "../apps/backend/src/config";
import { Account } from "../apps/backend/src/database/models";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ browser }) => {
  const [context, account] = await Promise.all([
    browser.newContext(),
    Account.query().findOne("slug", "gregberge").throwIfNotFound(),
  ]);
  await context.addCookies([
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

  await context.storageState({ path: authFile });
});
