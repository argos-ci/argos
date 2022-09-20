/* eslint-disable quotes */

exports.up = (knex) =>
  knex.schema.raw(
    `ALTER TABLE screenshot_diffs ALTER COLUMN "compareScreenshotId" DROP NOT NULL`
  );

exports.down = (knex) =>
  knex.schema.raw(
    `ALTER TABLE screenshot_diffs ALTER COLUMN "compareScreenshotId" SET NOT NULL`
  );
