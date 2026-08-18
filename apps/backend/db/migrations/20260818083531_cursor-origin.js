/**
 * Cursor Origin integration.
 *
 * Origin is Cursor's git forge. Its app model is the GitHub App one — an app
 * installed into a namespace, short-lived installation tokens, signed webhooks
 * — so the tables mirror the `github_*` ones rather than the GitLab access
 * token model.
 *
 * - `origin_installations`: one row per Origin installation of the Argos app.
 *   Cached installation tokens live here, like `github_installations`.
 * - `origin_repositories`: repositories the app can reach, discovered through
 *   the installation. A repository belongs to exactly one namespace and a
 *   namespace has exactly one installation of the app, so — unlike GitHub with
 *   its `main` + `light` pair — a repository is served by a single
 *   installation, kept as a plain foreign key instead of a join table.
 * - `origin_pull_requests`: mirrors `github_pull_requests`; the parallel
 *   `originPullRequestId` on `builds` is what links a build to it.
 *
 * `accounts.originInstallationId` is how an Argos account claims an
 * installation: Origin has no user OAuth, so the only way to know which Argos
 * account an installation belongs to is the install callback, exactly like
 * `githubLightInstallationId`.
 *
 * `builds` is huge and gets no index on the new column, same as
 * `githubPullRequestId`.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("origin_installations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("originId").notNullable().unique();
    table.string("targetSlug").notNullable();
    table.string("targetId").notNullable();
    table
      .enum("repoSelectionMode", ["all", "selected"])
      .notNullable()
      .defaultTo("all");
    table.jsonb("scopes").notNullable().defaultTo("[]");
    table.boolean("deleted").notNullable().defaultTo(false);
    table.text("token");
    table.dateTime("tokenExpiresAt");
  });

  await knex.schema.createTable("origin_repositories", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("originId").notNullable().unique();
    table.string("name").notNullable();
    table.string("ownerSlug").notNullable();
    table.string("ownerId").notNullable();
    table.string("defaultBranch").notNullable();
    table.bigInteger("originInstallationId").index();
    table.foreign("originInstallationId").references("origin_installations.id");
  });

  await knex.schema.createTable("origin_pull_requests", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("jobStatus").notNullable();
    table.bigInteger("originRepositoryId").notNullable();
    table.foreign("originRepositoryId").references("origin_repositories.id");
    table.integer("number").notNullable();
    table.string("originId");
    table.string("title");
    table.string("headRef");
    table.string("baseRef");
    table.string("baseSha");
    table.enum("state", ["open", "closed"]);
    table.dateTime("date");
    table.dateTime("closedAt");
    table.dateTime("mergedAt");
    table.boolean("merged");
    table.boolean("draft");
    table.string("commentId");
    table.boolean("commentDeleted").notNullable().defaultTo(false);
    table.string("mediaCommentId");
    table.boolean("mediaCommentDeleted").notNullable().defaultTo(false);
    table.unique(["originRepositoryId", "number"]);
    table.index(["originRepositoryId", "headRef"]);
  });

  await knex.schema.alterTable("accounts", (table) => {
    table.bigInteger("originInstallationId").index();
    table.foreign("originInstallationId").references("origin_installations.id");
  });

  await knex.schema.alterTable("projects", (table) => {
    table.bigInteger("originRepositoryId").index();
    table.foreign("originRepositoryId").references("origin_repositories.id");
  });

  await knex.schema.alterTable("builds", (table) => {
    table.bigInteger("originPullRequestId");
    table.foreign("originPullRequestId").references("origin_pull_requests.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", (table) => {
    table.dropColumn("originPullRequestId");
  });
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("originRepositoryId");
  });
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("originInstallationId");
  });
  await knex.schema.dropTable("origin_pull_requests");
  await knex.schema.dropTable("origin_repositories");
  await knex.schema.dropTable("origin_installations");
};
