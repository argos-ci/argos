/**
 * A build's lineage (`queryBuildLineage`) finds the buckets of one suite on one
 * branch of a project. Equality on a branch had no btree to use: the only index
 * on the column is the trigram one, built for the build list's branch search,
 * and an equality lookup through it intersects the posting lists of trigrams
 * every branch name shares ("fea", "eat", …). On a synthetic table of 1.4M
 * buckets that took 14 to 64 ms, where this index answers in 0.13 ms.
 *
 * The lineage runs on every build page through `Build.newerBuild`, polled while
 * the page is open, and already behind the previous approvals offered on a
 * build and the automatic approval of a concluded one.
 *
 * Leading on `projectId` then `branch`, so the build list's branch filter, which
 * matches a project's buckets on the branch alone, can use it too.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // A concurrent build that fails leaves the index in place, marked invalid,
  // and `IF NOT EXISTS` alone would then report success on an index no query
  // can use. Only an invalid one is dropped, never a working one built ahead
  // of the deploy.
  const invalid = await knex.raw(`
    SELECT 1
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    WHERE c.relname = 'screenshot_buckets_projectid_branch_name_idx'
      AND NOT i.indisvalid
  `);

  if (invalid.rows.length > 0) {
    await knex.raw(`
      DROP INDEX CONCURRENTLY screenshot_buckets_projectid_branch_name_idx
    `);
  }

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_buckets_projectid_branch_name_idx
    ON screenshot_buckets ("projectId", branch, name)
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS screenshot_buckets_projectid_branch_name_idx
  `);
};

// `CREATE INDEX CONCURRENTLY` cannot run inside a transaction, and building it
// without it would lock writes to the table for the duration.
export const config = { transaction: false };
