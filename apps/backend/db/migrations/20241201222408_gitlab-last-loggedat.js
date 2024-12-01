/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("gitlab_users", async (table) => {
    table.dateTime("lastLoggedAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("gitlab_users", async (table) => {
    table.dropColumn("lastLoggedAt");
  });
};
