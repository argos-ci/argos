const INDEX_NAME = "github_repository_installations_repo_installation_unique";

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Drop exact duplicate links, keeping the oldest row (lowest id), so the
  // unique index below can be created.
  await knex.raw(`
    DELETE FROM github_repository_installations a
    USING github_repository_installations b
    WHERE a.id > b.id
      AND a."githubRepositoryId" = b."githubRepositoryId"
      AND a."githubInstallationId" = b."githubInstallationId"
  `);
  await knex.schema.alterTable("github_repository_installations", (table) => {
    table.unique(["githubRepositoryId", "githubInstallationId"], {
      indexName: INDEX_NAME,
    });
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_repository_installations", (table) => {
    table.dropUnique(
      ["githubRepositoryId", "githubInstallationId"],
      INDEX_NAME,
    );
  });
};
