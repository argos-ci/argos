/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Trigram matching for substring search, btree_gin to combine
  // a bigint equality column ("projectId") with a trigram column
  // in a single GIN index.
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS btree_gin`);

  // Substring search on branch, scoped to a project.
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_buckets_projectid_branch_trgm_idx
    ON screenshot_buckets USING gin ("projectId", branch gin_trgm_ops)
  `);

  // Commit prefix search (LIKE 'sha%'), scoped to a project.
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_buckets_projectid_commit_pattern_idx
    ON screenshot_buckets ("projectId", commit varchar_pattern_ops)
  `);

  // Pull request head commit prefix search, scoped to a project.
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_projectid_prheadcommit_pattern_idx
    ON builds ("projectId", "prHeadCommit" varchar_pattern_ops)
    WHERE "prHeadCommit" IS NOT NULL
  `);

  // Serves the builds list ordering (with or without filters), avoiding
  // a sort of all the project builds on every page.
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_projectid_createdat_number_idx
    ON builds ("projectId", "createdAt" DESC, number DESC)
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS screenshot_buckets_projectid_branch_trgm_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS screenshot_buckets_projectid_commit_pattern_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_projectid_prheadcommit_pattern_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS builds_projectid_createdat_number_idx`,
  );
  // Extensions are left installed: they may be used by other indexes.
};

export const config = { transaction: false };
