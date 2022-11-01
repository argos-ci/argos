/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.raw(
    'ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" DROP NOT NULL'
  );
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.raw(
    'ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" SET NOT NULL'
  );
};
