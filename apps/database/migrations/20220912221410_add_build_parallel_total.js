exports.up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.integer("totalBatch");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("totalBatch");
  });
};
