/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.renameColumn("baselineBranch", "defaultBaseBranch");
    table.string("autoApprovedBranchGlob");
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.renameColumn("referenceBranch", "baseBranch");
    table.renameColumn("referenceCommit", "baseCommit");
    table.enum("baseBranchResolvedFrom", ["sdk", "pull-request", "project"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.renameColumn("defaultBaseBranch", "baselineBranch");
    table.dropColumn("autoApprovedBranchGlob");
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.renameColumn("baseBranch", "referenceBranch");
    table.renameColumn("baseCommit", "referenceCommit");
    table.dropColumn("baseBranchResolvedFrom");
  });
};
