/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `create index concurrently if not exists screenshot_diffs_baseScreenshotId_index on screenshot_diffs ("baseScreenshotId");`
  );
  await knex.raw(
    `create index concurrently if not exists screenshot_diffs_compareScreenshotId_index on screenshot_diffs ("compareScreenshotId");`
  );
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    drop index screenshot_diffs_baseScreenshotId_index;;
    drop index screenshot_diffs_compareScreenshotId_index;
  `);
};

export const config = { transaction: false };
