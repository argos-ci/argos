/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
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

  await knex.schema.createTable("audit_trails", (table) => {
    table.bigIncrements("id").primary();

    table.timestamp("date").notNullable();

    table
      .bigInteger("projectId")
      .notNullable()
      .comment("Project related to the action");
    table.foreign("projectId").references("projects.id");

    table
      .bigInteger("testId")
      .notNullable()
      .comment("Test related to the action");
    table.foreign("testId").references("tests.id");

    table.index(["projectId", "testId"]);

    table
      .bigInteger("userId")
      .notNullable()
      .comment("User who performed the action");
    table.foreign("userId").references("users.id");

    table
      .string("action")
      .notNullable()
      .comment("Action performed, e.g., 'file.ignored', 'file.unignored'");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("ignored_files");
  await knex.schema.dropTable("audit_trails");
};
