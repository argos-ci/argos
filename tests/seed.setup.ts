import { test as setup } from "@playwright/test";

import { knex } from "../apps/backend/src/database";
import { seed } from "../apps/backend/src/database/seeds";
import { truncateAll } from "../apps/backend/src/database/testing";

setup("seed-database", async () => {
  await truncateAll(knex);
  await seed();
});
