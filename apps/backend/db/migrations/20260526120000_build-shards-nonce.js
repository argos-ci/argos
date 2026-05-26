/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("build_shards", (table) => {
    table.string("nonce");
  });

  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY build_shards_buildid_nonce_unique
    ON build_shards ("buildId", nonce)
  `);

  await knex.raw(`
    DROP INDEX CONCURRENTLY build_shards_buildid_index
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY build_shards_buildid_index
    ON build_shards ("buildId")
  `);

  await knex.raw(`
    DROP INDEX CONCURRENTLY build_shards_buildid_nonce_unique
  `);

  await knex.schema.alterTable("build_shards", (table) => {
    table.dropColumn("nonce");
  });
};

export const config = { transaction: false };
