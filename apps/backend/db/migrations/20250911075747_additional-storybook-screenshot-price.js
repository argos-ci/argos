/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("subscriptions", (table) => {
    table.float("additionalStorybookScreenshotPrice");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("subscriptions", (table) => {
    table.dropColumn("additionalStorybookScreenshotPrice");
  });
};
