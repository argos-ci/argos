/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable(
    "build_merge_queue_gh_pull_requests",
    (table) => {
      table.bigIncrements("id").primary();
      table.dateTime("createdAt").notNullable();
      table.dateTime("updatedAt").notNullable();
      table.bigInteger("buildId").notNullable().index();
      table.foreign("buildId").references("builds.id").onDelete("CASCADE");
      table.bigInteger("githubPullRequestId").notNullable().index();
      table
        .foreign("githubPullRequestId")
        .references("github_pull_requests.id")
        .onDelete("CASCADE");
      table.unique(["buildId", "githubPullRequestId"]);
    },
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("build_merge_queue_gh_pull_requests");
};
