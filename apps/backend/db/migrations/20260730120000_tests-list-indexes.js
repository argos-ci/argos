/**
 * Indexes backing the account-wide and per-project Tests lists.
 *
 * 1. `screenshot_diffs_buildid_active_idx` — the "candidate diffs" step of
 *    `queryActiveTests` reads every diff of every latest reference build and
 *    needs `(testId, compareScreenshotId)`. The index it replaces only carried
 *    `testId`, so each of those rows cost a heap fetch just to read the second
 *    column. Both columns in `INCLUDE` makes the step index-only.
 *
 * 2. `screenshot_diffs_testid_id_with_file_idx` — `Test.firstSeenDiff` /
 *    `lastSeenDiff` look for the oldest and newest diff of a test that still has
 *    an image (`fileId IS NOT NULL`, i.e. the diff recorded a change). No index
 *    could serve both the filter and the ordering: the partial one is keyed
 *    `(testId, fingerprint, id)`, so `fingerprint` sits between the equality and
 *    the sort key, and the only `(testId, id)` index is not partial — Postgres
 *    walked the test's whole history heap-fetching rows to test `fileId`. A test
 *    that has never changed has no matching row at all, so that walk covered
 *    every diff it ever had.
 *
 * 3. `test_stats_fingerprints_testid_date_idx` — the flakiness computation
 *    filters on `(testId, date-range)`, but the primary key is
 *    `(testId, fingerprint, date)`, so answering a 7-day window meant reading
 *    every fingerprint row the test ever recorded. `INCLUDE` carries the two
 *    columns the aggregation needs so it stays index-only.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_diffs_buildid_active_idx
       ON screenshot_diffs ("buildId")
       INCLUDE ("testId", "compareScreenshotId")
       WHERE "testId" IS NOT NULL`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS screenshot_diffs_buildid_notnull_include_testid_idx`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_diffs_testid_id_with_file_idx
       ON screenshot_diffs ("testId", id)
       WHERE "fileId" IS NOT NULL`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS test_stats_fingerprints_testid_date_idx
       ON test_stats_fingerprints ("testId", date)
       INCLUDE (fingerprint, value)`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_diffs_buildid_notnull_include_testid_idx
       ON screenshot_diffs ("buildId")
       INCLUDE ("testId")
       WHERE "testId" IS NOT NULL`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS screenshot_diffs_buildid_active_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS screenshot_diffs_testid_id_with_file_idx`,
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS test_stats_fingerprints_testid_date_idx`,
  );
};

export const config = { transaction: false };
