/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.dropColumn("accessToken");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.string("accessToken");
  });
};
