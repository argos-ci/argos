/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshot_buckets", async (table) => {
    table.integer("screenshotCount");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshot_buckets", async (table) => {
    table.dropColumn("screenshotCount");
  });
};
