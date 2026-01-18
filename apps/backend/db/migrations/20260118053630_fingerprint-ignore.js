/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("ignored_changes", (table) => {
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

    table.string("fingerprint", 80);

    table.primary(["projectId", "testId", "fingerprint"]);
  });

  await knex.schema.alterTable("audit_trails", (table) => {
    table.string("fingerprint", 80);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("ignored_changes");
  await knex.schema.alterTable("audit_trails", (table) => {
    table.dropColumn("fingerprint");
  });
};
