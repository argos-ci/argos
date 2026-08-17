/**
 * Billing reads a project's buckets over a window — the current period and the
 * one before it. `screenshot_buckets_projectid_index` gets it to the project's
 * rows, but the date is then a filter applied after the fact, so the scan walks
 * every bucket the project ever produced: on the paying accounts, measured in
 * production, 11k rows read per project to keep the 2k inside the window.
 *
 * The two counts are carried in the index rather than left on the row. They are
 * all the aggregate reads, so including them turns the scan into an index-only
 * one and drops the heap access that dominated the query — the reason bounding
 * it by date alone barely moved it. Two integers per row is a cheap way to buy
 * that.
 *
 * Leading on `projectId` so this index also serves every lookup the
 * `projectId`-only one serves, which makes that one redundant. It is left in
 * place here: dropping it is a separate decision, and this migration is about
 * making the window cheap.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // A concurrent build that fails leaves the index in place, marked invalid —
  // a cancelled deploy, a statement timeout or a deadlock is enough. Knex
  // records nothing for a migration that threw, so `up` runs again on the next
  // deploy, and `IF NOT EXISTS` alone would find that invalid index, build
  // nothing and report success: the table would carry an index every insert
  // maintains and no query can use.
  //
  // Only an invalid one is dropped, never a working one. On a table this size
  // the index is worth building by hand, at a chosen moment, ahead of the
  // deploy that needs it — and a blanket drop would tear that down and rebuild
  // it, which is the opposite of the point.
  const invalid = await knex.raw(`
    SELECT 1
    FROM pg_class c
    JOIN pg_index i ON i.indexrelid = c.oid
    WHERE c.relname = 'screenshot_buckets_projectid_createdat_index'
      AND NOT i.indisvalid
  `);

  if (invalid.rows.length > 0) {
    await knex.raw(`
      DROP INDEX CONCURRENTLY screenshot_buckets_projectid_createdat_index
    `);
  }

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_buckets_projectid_createdat_index
    ON screenshot_buckets ("projectId", "createdAt")
    INCLUDE ("screenshotCount", "storybookScreenshotCount")
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS screenshot_buckets_projectid_createdat_index
  `);
};

// `CREATE INDEX CONCURRENTLY` cannot run inside a transaction, and building it
// without it would lock writes to the table for the duration.
export const config = { transaction: false };
