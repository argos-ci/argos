/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("tests", (table) => {
    table.boolean("muted").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("tests", (table) => {
    table.dropColumn("muted");
  });
};
