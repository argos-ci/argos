exports.up = async (knex) => {
  await knex.raw(
    `create index concurrently if not exists screenshot_diffs_baseScreenshotId_index on screenshot_diffs ("baseScreenshotId");`
  );
  await knex.raw(
    `create index concurrently if not exists screenshot_diffs_compareScreenshotId_index on screenshot_diffs ("compareScreenshotId");`
  );
};

exports.down = async (knex) => {
  await knex.raw(`
    drop index screenshot_diffs_baseScreenshotId_index;;
    drop index screenshot_diffs_compareScreenshotId_index;
  `);
};

exports.config = { transaction: false };
