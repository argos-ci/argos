/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("files", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("key").notNullable().unique();
  });

  await knex.schema.table("screenshots", (table) => {
    table.bigInteger("fileId").index();
    table.foreign("fileId").references("files.id");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("screenshots", (table) => {
    table.dropColumn("fileId");
  });

  await knex.schema.dropTableIfExists("files");
};
