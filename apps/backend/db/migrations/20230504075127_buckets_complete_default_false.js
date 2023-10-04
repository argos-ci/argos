/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshot_buckets", (table) => {
    table.boolean("complete").notNullable().defaultTo(false).alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshot_buckets", (table) => {
    table.boolean("complete").notNullable().defaultTo(true).alter();
  });
};
