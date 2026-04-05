/* eslint-disable no-empty-pattern */
import { test as base } from "@playwright/test";

import { knex } from "../apps/backend/src/database";
import * as models from "../apps/backend/src/database/models";
import { seed } from "../apps/backend/src/database/seeds";
import { truncateAll } from "../apps/backend/src/database/testing";

export const seedTest = base.extend<object, { models: typeof models }>({
  models: [
    async ({}, use) => {
      await truncateAll(knex);
      await seed();
      await use(models);
    },
    { scope: "worker" },
  ],
});
