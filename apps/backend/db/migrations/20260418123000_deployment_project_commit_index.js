/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.index(["projectId", "commitSha"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.dropIndex(["projectId", "commitSha"]);
  });
};
