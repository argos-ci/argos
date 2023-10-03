/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (t) => t.index("baseScreenshotBucketId"));
  await knex.schema.table("builds", (t) =>
    t.index("compareScreenshotBucketId"),
  );
  await knex.schema.table("screenshot_diffs", (t) => t.index("buildId"));
  await knex.schema.table("screenshots", (t) => t.index("screenshotBucketId"));
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("builds", (t) =>
    t.dropIndex("baseScreenshotBucketId"),
  );
  await knex.schema.table("builds", (t) =>
    t.dropIndex("compareScreenshotBucketId"),
  );
  await knex.schema.table("screenshot_diffs", (t) => t.dropIndex("buildId"));
  await knex.schema.table("screenshots", (t) =>
    t.dropIndex("screenshotBucketId"),
  );
};
