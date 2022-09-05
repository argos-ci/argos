exports.up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.string("baselineBranch").nullable().alter();
    table.boolean("useDefaultBranch").notNullable().defaultTo(true);
    table.string("defaultBranch");
  });

  await knex("repositories").update({ useDefaultBranch: false });

  await knex.raw(
    `ALTER TABLE repositories ADD CONSTRAINT repositories_one_branch_not_null CHECK (coalesce("baselineBranch", '') <> '' or coalesce("defaultBranch", '') <> '')`
  );
};

exports.down = async (knex) => {
  await knex.raw(
    "ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_one_branch_not_null"
  );

  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("defaultBranch");
    table.string("baselineBranch").notNullable().alter();
  });
};
