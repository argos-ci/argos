exports.up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.string("githubDefaultBranch");
    table.string("baselineBranch").nullable().alter();
  });

  await knex.raw(
    `ALTER TABLE repositories ADD CONSTRAINT repositories_one_branch_not_null CHECK (coalesce("baselineBranch", '') <> '' or coalesce("githubDefaultBranch", '') <> '')`
  );
};

exports.down = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("githubDefaultBranch");
    table.string("baselineBranch").notNullable().alter();
  });

  await knex.raw(
    "ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_one_branch_not_null"
  );
};
