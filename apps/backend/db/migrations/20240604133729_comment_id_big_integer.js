/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("github_pull_requests", async (table) => {
    table.bigInteger("commentId").alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_pull_requests", async (table) => {
    table.integer("commentId").alter();
  });
};
