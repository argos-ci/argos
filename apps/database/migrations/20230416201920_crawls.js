/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("crawls", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.specificType("jobStatus", "job_status").notNullable().index();
    table.bigInteger("buildId").notNullable().index();
    table.foreign("buildId").references("builds.id");
    table.string("baseUrl").notNullable();
  });

  await knex.schema.createTable("captures", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.specificType("jobStatus", "job_status").notNullable().index();
    table.bigInteger("crawlId").notNullable().index();
    table.foreign("crawlId").references("crawls.id");
    table.bigInteger("screenshotId").index();
    table.foreign("screenshotId").references("screenshots.id");
    table.bigInteger("fileId").index();
    table.foreign("fileId").references("files.id");
    table.string("url").notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("captures");
  await knex.schema.dropTableIfExists("crawls");
};
