/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.string("startDate").notNullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.string("startDate").nullable().alter();
  });
};
