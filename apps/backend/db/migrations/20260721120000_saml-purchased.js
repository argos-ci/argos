/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("teams", (table) => {
    table.boolean("samlPurchased").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("teams", (table) => {
    table.dropColumn("samlPurchased");
  });
};
