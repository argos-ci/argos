/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.dropTable("test_stats_changes");
  await knex.schema.dropTable("ignored_files");
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.createTable("ignored_files", (table) => {
    table
      .bigInteger("projectId")
      .notNullable()
      .comment(
        "Project to which the file is ignored in. Files are global, so we need to scope by project",
      );
    table.foreign("projectId").references("projects.id");

    table
      .bigInteger("testId")
      .notNullable()
      .comment(
        "Test to which the file is ignored in. Files are global, so we need to scope by test",
      );
    table.foreign("testId").references("tests.id");

    table.bigInteger("fileId").notNullable().comment("File that is ignored");
    table.foreign("fileId").references("files.id");

    table.primary(["projectId", "testId", "fileId"]);
  });

  await knex.schema.createTable("test_stats_changes", (table) => {
    table.bigInteger("testId").notNullable().references("tests.id");
    table.bigInteger("fileId").notNullable().references("files.id");
    table.dateTime("date").notNullable();
    table.primary(["testId", "fileId", "date"]);
    table.integer("value").notNullable();
  });
};
