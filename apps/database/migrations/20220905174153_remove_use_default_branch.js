exports.up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("useDefaultBranch");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.boolean("useDefaultBranch").notNullable().defaultTo(true);
  });
};
