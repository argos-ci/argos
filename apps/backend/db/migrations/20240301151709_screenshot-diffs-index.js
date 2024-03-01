/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS screenshot_diffs_jobstatus_index ON screenshot_diffs ("jobStatus")`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS builds_jobstatus_index ON builds ("jobStatus")`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS screenshot_diffs_jobstatus_index`);
  await knex.raw(`DROP INDEX IF EXISTS builds_jobstatus_index`);
};

export const config = { transaction: false };
