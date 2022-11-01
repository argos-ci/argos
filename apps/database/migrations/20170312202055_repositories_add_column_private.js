/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.boolean("private").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.dropColumn("private");
  });
};
