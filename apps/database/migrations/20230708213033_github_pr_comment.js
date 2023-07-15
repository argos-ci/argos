/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("github_pull_requests", async (table) => {
    table.increments("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.boolean("commentDeleted").defaultTo(false).notNullable();
    table.integer("commentId").unsigned();
    table.bigInteger("githubRepositoryId").unsigned().notNullable();
    table.foreign("githubRepositoryId").references("github_repositories.id");
    table.integer("number").notNullable();
  });

  await knex.schema.alterTable("builds", async (table) => {
    table.bigInteger("githubPullRequestId").unsigned();
    table.foreign("githubPullRequestId").references("github_pull_requests.id");
  });

  await knex.schema.alterTable("projects", async (table) => {
    table.boolean("prCommentEnabled").defaultTo(true).notNullable();
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
    table.dropForeign(["githubPullRequestId"]);
    table.dropColumn("githubPullRequestId");
  });

  await knex.schema.dropTable("github_pull_requests");
};
