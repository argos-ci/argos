/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
  ALTER TABLE screenshot_buckets ADD CONSTRAINT chk_complete_true_screenshotcount_not_null CHECK (complete = false OR "screenshotCount" IS not NULL);
  `);
  await knex.raw(`
    CREATE INDEX screenshot_buckets_createdat ON screenshot_buckets ("createdAt");
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE screenshot_buckets DROP CONSTRAINT chk_complete_true_screenshotcount_not_null;
  `);
  await knex.raw(`
    DROP INDEX screenshot_buckets_createdat;
  `);
};
