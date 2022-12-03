/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    'ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" DROP NOT NULL'
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    'ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" SET NOT NULL'
  );
};
