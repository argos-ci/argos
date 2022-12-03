/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) =>
  knex.schema.table("screenshot_buckets", (table) => {
    table.boolean("complete").defaultTo(true).index();
  });

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) =>
  knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("complete");
  });
