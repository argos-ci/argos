/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("github_accounts", (table) => {
    table.jsonb("emails");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("github_accounts", (table) => {
    table.dropColumn("emails");
  });
};
