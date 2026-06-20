/**
 * Guarantee a user can have at most one active pending review per build, so
 * draft (review) comments always attach to a single, well-defined review.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS build_reviews_pending_unique
    ON build_reviews ("buildId", "userId")
    WHERE state = 'pending' AND "dismissedAt" IS NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS build_reviews_pending_unique
  `);
};

export const config = { transaction: false };
