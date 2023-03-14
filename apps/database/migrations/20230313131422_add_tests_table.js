/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("tests", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable();
    table.bigInteger("repositoryId").notNullable().index();
    table.foreign("repositoryId").references("repositories.id");
    table.string("buildName").notNullable();
    table.string("status").notNullable().defaultTo("pending");
    table.dateTime("resolvedDate");
    table.integer("resolvedStabilityScore");
    table.dateTime("muteUntil");
    table.unique(["repositoryId", "buildName", "name"]);
  });

  await knex.schema.alterTable("screenshot_diffs", (table) => {
    table.bigInteger("testId").index();
    table.foreign("testId").references("tests.id");
  });

  await knex.schema.alterTable("screenshots", (table) => {
    table.bigInteger("testId").index();
    table.foreign("testId").references("tests.id");
  });

  await knex.schema.createTable("test_activities", (table) => {
    table.string("userId").notNullable();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.dateTime("date");
    table.string("action");
    table.jsonb("data");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("test_activities");

  await knex.schema.table("screenshot_diffs", (table) => {
    table.dropColumn("testId");
  });

  await knex.schema.table("screenshots", (table) => {
    table.dropColumn("testId");
  });

  await knex.schema.dropTableIfExists("tests");
};
