/**
 * Index backing the cross-project lookup of a commit's builds.
 *
 * `Build.siblingBuilds` starts from a commit SHA and has to find every project
 * that built it, so it can no longer lean on `projectId` to narrow the scan.
 * `screenshot_buckets.commit` is already indexed on its own; the head commit of
 * a pull request build lives on `builds."prHeadCommit"` instead, and had no
 * index that did not start with `projectId`. Partial, because the column is
 * null on every build that did not come from a pull request.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_prheadcommit_idx
       ON builds ("prHeadCommit")
       WHERE "prHeadCommit" IS NOT NULL`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS builds_prheadcommit_idx`);
};

export const config = { transaction: false };
