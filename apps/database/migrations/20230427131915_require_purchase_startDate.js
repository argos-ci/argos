/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.dateTime("startDate").notNullable().defaultTo(knex.fn.now()).alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.dateTime("startDate").nullable().defaultTo(knex.fn.now()).alter();
  });
};
