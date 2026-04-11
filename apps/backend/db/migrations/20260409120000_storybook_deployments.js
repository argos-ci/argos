/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("deployments", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("projectId").notNullable().index();
    table.foreign("projectId").references("projects.id").onDelete("cascade");
    table
      .enum("status", ["pending", "ready", "error"])
      .notNullable()
      .defaultTo("pending");
    table.enum("environment", ["preview", "production"]).notNullable();
    table.string("branch").nullable();
    table.string("commitSha").nullable();
    table.bigInteger("githubPullRequestId").unsigned().nullable();
    table.foreign("githubPullRequestId").references("github_pull_requests.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("deployments");
};
