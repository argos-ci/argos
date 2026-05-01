/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.string("deploymentProdBranchGlob");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("deploymentProdBranchGlob");
  });
};
