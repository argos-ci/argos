/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("jobStatus");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("screenshot_buckets", (table) => {
    table.string("jobStatus").notNullable();
  });
};
