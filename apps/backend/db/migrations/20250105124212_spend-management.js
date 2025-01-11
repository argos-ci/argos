/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", async (table) => {
    table.integer("meteredSpendLimitByPeriod");
  });

  await knex.schema.alterTable("subscriptions", async (table) => {
    table.float("additionalScreenshotPrice");
    table.string("currency");
    table.dateTime("usageUpdatedAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", async (table) => {
    table.dropColumn("meteredSpendLimitByPeriod");
  });

  await knex.schema.alterTable("subscriptions", async (table) => {
    table.dropColumn("additionalScreenshotPrice");
    table.dropColumn("currency");
    table.dropColumn("usageUpdatedAt");
  });
};
