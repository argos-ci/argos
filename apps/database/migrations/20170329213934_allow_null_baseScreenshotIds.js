/* eslint-disable quotes */

/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.raw(
    `ALTER TABLE screenshot_diffs ALTER COLUMN "baseScreenshotId" DROP NOT NULL`
  );
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.raw(
    `ALTER TABLE screenshot_diffs ALTER COLUMN "baseScreenshotId" SET NOT NULL`
  );
};
