/* eslint-disable no-empty-pattern */
import { test as base } from "@playwright/test";

import argosConfig from "../apps/backend/src/config";
import { getKnexFromConfig } from "../apps/backend/src/database";
import * as models from "../apps/backend/src/database/models";
import { seed } from "../apps/backend/src/database/seeds";
import { truncateAll } from "../apps/backend/src/database/testing";
import { initObjection } from "../apps/backend/src/database/util/model";

export const seedTest = base.extend<object, { models: typeof models }>({
  models: [
    async ({}, use) => {
      const { parallelIndex } = base.info();
      const config = argosConfig.set(
        "pg.connection.database",
        `test-${parallelIndex}`,
      );
      const knex = getKnexFromConfig(config);
      initObjection(knex);
      await truncateAll(knex);
      await seed();
      await use(models);
    },
    { scope: "worker" },
  ],
});
