/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.renameColumn("baselineBranch", "defaultBaseBranch");
    table.string("referenceBranchGlob");
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.renameColumn("referenceBranch", "baseBranch");
    table.enum("baseBranchResolvedFrom", ["sdk", "pull-request", "project"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.renameColumn("defaultBaseBranch", "baselineBranch");
    table.dropColumn("referenceBranchGlob");
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.renameColumn("baseBranch", "referenceBranch");
    table.dropColumn("baseBranchResolvedFrom");
  });
};
