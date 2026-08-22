/**
 * Index the builds → pull request foreign keys, so "the builds of this pull
 * request" — what the project's pull request list shows on every row — is a
 * lookup instead of a scan of the project's whole build history.
 *
 * Partial on `IS NOT NULL`: most builds have no pull request at all, and those
 * rows are exactly the ones the lookup can never ask for.
 *
 * Built `CONCURRENTLY`, which Postgres refuses inside a transaction — so the
 * migration runs without one. `builds` is on the upload path, and a plain build
 * would hold SHARE against it for the whole index build. Running unwrapped
 * means a failure leaves the migration unrecorded with the schema half-applied,
 * so each index is dropped before it is built: a concurrent build that failed
 * leaves an *invalid* index under the right name, and skipping on the name
 * would keep an index that answers nothing.
 */
export const config = { transaction: false };

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_githubpullrequestid_index`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY builds_githubpullrequestid_index ON builds ("githubPullRequestId") WHERE "githubPullRequestId" IS NOT NULL`,
  );

  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_originpullrequestid_index`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY builds_originpullrequestid_index ON builds ("originPullRequestId") WHERE "originPullRequestId" IS NOT NULL`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_githubpullrequestid_index`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_originpullrequestid_index`,
  );
};
