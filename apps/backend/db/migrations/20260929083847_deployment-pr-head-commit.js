/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.string("prHeadCommit");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.dropColumn("prHeadCommit");
  });
};
