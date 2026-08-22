/**
 * Make the billing scan on `screenshot_buckets` actually index-only.
 *
 * `screenshot_buckets_projectid_createdat_index` was built to carry the two
 * counts so the billing window could be answered from the index alone. It was
 * not: measured in production, that scan reported `Heap Fetches: 163249` on
 * 235k rows read, and 121k buffer accesses — roughly 950 MB — for 150 sums.
 *
 * An index-only scan still has to check visibility, which lives in the row and
 * not in the index, so it can only skip the table for pages the visibility map
 * flags as all-visible. Only vacuum sets that flag. This table is almost purely
 * inserted, so the dead-tuple trigger that normally schedules autovacuum
 * (0.5% dead here) effectively never fires, and the insert trigger added in
 * Postgres 13 defaults to `1000 + 0.2 × reltuples` — about 775k inserts on this
 * table, or once a quarter at the current rate. The pages holding the period
 * being billed are therefore always the ones never visited.
 *
 * The scale factor is set to zero rather than lowered: proportional to the
 * table, the interval grows as the table does, so the staleness this fixes
 * would return, worse, as Argos grows. An absolute threshold holds the interval
 * at roughly two days whatever the row count. A vacuum here costs six seconds
 * scanning 20% of pages, and skips pages already flagged, so a run every two
 * days sees only what was written since the last one.
 *
 * Measured after a manual `VACUUM (ANALYZE)`: heap fetches 163249 → 1, buffers
 * 121k → 2.2k, 233 ms → 145 ms. What is left is volume, not visibility.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    ALTER TABLE screenshot_buckets SET (
      autovacuum_vacuum_insert_scale_factor = 0,
      autovacuum_vacuum_insert_threshold = 20000
    )
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE screenshot_buckets RESET (
      autovacuum_vacuum_insert_scale_factor,
      autovacuum_vacuum_insert_threshold
    )
  `);
};
