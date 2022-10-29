/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.string("name").notNullable().defaultTo("default");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("name");
  });
};
