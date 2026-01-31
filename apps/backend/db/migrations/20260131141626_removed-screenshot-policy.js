/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.boolean("subset").defaultTo(false).notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("subset");
  });
};
