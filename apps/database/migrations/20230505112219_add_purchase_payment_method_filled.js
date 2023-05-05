/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.boolean("paymentMethodFilled");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.dropColumn("paymentMethodFilled");
  });
};
