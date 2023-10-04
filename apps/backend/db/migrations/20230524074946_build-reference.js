/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.string("referenceCommit");
    table.string("referenceBranch");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.dropColumn("referenceBranch");
    table.dropColumn("referenceCommit");
  });
};
