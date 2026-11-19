/**
 * Indexes backing the pull request stack of a build page.
 *
 * A stack is followed upward through the open pull requests merging into a
 * head branch (`baseRef`), and every pull request of it is shown with its
 * latest build: neither lookup had an index, so both scanned a whole
 * repository's pull requests or a whole project's builds. All partial: only
 * open pull requests are ever followed, and most builds come from no pull
 * request of a given provider.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS github_pull_requests_githubrepositoryid_baseref_index
       ON github_pull_requests ("githubRepositoryId", "baseRef")
       WHERE state = 'open'`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS origin_pull_requests_originrepositoryid_baseref_index
       ON origin_pull_requests ("originRepositoryId", "baseRef")
       WHERE state = 'open'`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_githubpullrequestid_idx
       ON builds ("githubPullRequestId")
       WHERE "githubPullRequestId" IS NOT NULL`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_originpullrequestid_idx
       ON builds ("originPullRequestId")
       WHERE "originPullRequestId" IS NOT NULL`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS github_pull_requests_githubrepositoryid_baseref_index`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS origin_pull_requests_originrepositoryid_baseref_index`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_githubpullrequestid_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_originpullrequestid_idx`,
  );
};

export const config = { transaction: false };
