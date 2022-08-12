exports.up = async (knex) => {
  await knex.schema.createTable("files", (table) => {
    table.bigincrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("key").notNullable().unique();
  });

  await knex.schema.table("screenshots", (table) => {
    table.bigInteger("fileId").index();
    table.foreign("fileId").references("files.id");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("screenshots", (table) => {
    table.dropColumn("fileId");
  });

  await knex.schema.dropTableIfExists("files");
};
