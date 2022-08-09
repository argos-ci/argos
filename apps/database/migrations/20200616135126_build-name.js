exports.up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.string("name").notNullable().defaultTo("default");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("name");
  });
};
