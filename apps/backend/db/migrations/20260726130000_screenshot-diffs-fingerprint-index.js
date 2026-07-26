/**
 * Index backing the lookup of the latest diff for a given change, used by
 * `TestChange.lastSeenDiff` (the ignored-changes ledger reads one per row).
 *
 * Without it, `(testId, fingerprint)` lookups fall back to
 * `screenshot_diffs_test_id_id_desc_idx` and read every diff of the test before
 * filtering on the fingerprint — a long-lived test has one diff per build, so
 * that is thousands of heap fetches per row. Partial on `fileId IS NOT NULL`
 * because the lookup only wants diffs whose image is still available, and
 * `id DESC` so the "most recent first" ordering is served by the index.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_diffs_testid_fingerprint_id_desc_notnull_idx
       ON screenshot_diffs ("testId", fingerprint, id DESC)
       WHERE "fileId" IS NOT NULL`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(
    `DROP INDEX IF EXISTS screenshot_diffs_testid_fingerprint_id_desc_notnull_idx`,
  );
};

export const config = { transaction: false };
