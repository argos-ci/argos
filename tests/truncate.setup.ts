import { test as setup } from "@playwright/test";

import { knex } from "../apps/backend/src/database";
import { truncateAll } from "../apps/backend/src/database/testing";

setup("truncate-database", async () => {
  await truncateAll(knex);
});
