/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("enabled");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.boolean("enabled").notNullable().defaultTo(false).index();
  });
};
