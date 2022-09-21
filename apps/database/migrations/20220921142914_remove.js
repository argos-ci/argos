exports.up = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.dropColumn("enabled");
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable("repositories", async (table) => {
    table.boolean("enabled").notNullable().defaultTo(false).index();
  });
};
