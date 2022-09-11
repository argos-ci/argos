exports.up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.enum("type", ["reference", "check", "orphan"]);
  });
};

exports.down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("type");
  });
};
