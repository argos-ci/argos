/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", async (table) => {
    table.string("gitlabBaseUrl");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", async (table) => {
    table.dropColumn("gitlabBaseUrl");
  });
};
