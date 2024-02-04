/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("subscriptions", async (table) => {
    table.integer("includedScreenshots");
  });

  await knex.schema.alterTable("plans", async (table) => {
    table.renameColumn("screenshotsLimitPerMonth", "includedScreenshots");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("subscriptions", async (table) => {
    table.dropColumn("includedScreenshots");
  });

  await knex.schema.alterTable("plans", async (table) => {
    table.renameColumn("includedScreenshots", "screenshotsLimitPerMonth");
  });
};
