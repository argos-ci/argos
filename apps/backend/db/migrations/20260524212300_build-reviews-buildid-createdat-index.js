/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS build_reviews_buildid_createdat_index
    ON build_reviews ("buildId", "createdAt" DESC)
  `);

  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS build_reviews_buildid_index
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS build_reviews_buildid_index
    ON build_reviews ("buildId")
  `);

  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS build_reviews_buildid_createdat_index
  `);
};

export const config = { transaction: false };
