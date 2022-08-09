exports.up = async (knex) =>
  knex.schema.table("screenshot_buckets", (table) => {
    table.boolean("complete").defaultTo(true).index();
  });

exports.down = async (knex) =>
  knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("complete");
  });
