/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("pull_requests", async (table) => {
    table.increments("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("projectId").unsigned().notNullable();
    table.foreign("projectId").references("projects.id");
    table.string("number").notNullable();
    table.bigInteger("commentId").unsigned();
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.bigInteger("pullRequestId").unsigned();
    table.foreign("pullRequestId").references("pull_requests.id");
  });

  await knex.schema.alterTable("projects", async (table) => {
    table.boolean("prCommentEnabled");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropColumn("prCommentEnabled");
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.dropForeign(["pullRequestId"]);
    table.dropColumn("pullRequestId");
  });

  await knex.schema.dropTable("pull_requests");
};
