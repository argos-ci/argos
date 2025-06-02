/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("test_stats_changes", (table) => {
    table.bigInteger("testId").notNullable().references("tests.id");
    table.bigInteger("fileId").nullable().references("files.id");
    table.dateTime("date").notNullable();
    table.primary(["testId", "fileId", "date"]);
    table.integer("value").notNullable();
  });

  await knex.schema.createTable("test_stats_builds", (table) => {
    table.bigInteger("testId").notNullable().references("tests.id");
    table.dateTime("date").notNullable();
    table.primary(["testId", "date"]);
    table.integer("value").notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("test_stats_changes");
  await knex.schema.dropTable("test_stats_builds");
};
