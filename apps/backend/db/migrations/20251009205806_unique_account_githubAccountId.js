/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.unique("githubAccountId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.dropUnique(["githubAccountId"]);
  });
};
