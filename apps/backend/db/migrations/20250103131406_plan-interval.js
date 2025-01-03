/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("plans", async (table) => {
    table.enum("interval", ["month", "year"]).notNullable().defaultTo("month");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", async (table) => {
    table.dropColumn("interval");
  });
};
