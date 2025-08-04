/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("screenshot_buckets", (table) => {
    table.integer("storybookScreenshotCount");
  });

  // Update existing records in batch to avoid long transaction times
  // and to prevent locking the table for too long.
  while (true) {
    const result = await knex.raw(`
      WITH buckets AS (
        SELECT id
        FROM screenshot_buckets
        WHERE complete = true
          AND "storybookScreenshotCount" IS NULL
        LIMIT 1000
      )
      UPDATE screenshot_buckets sb
      SET "storybookScreenshotCount" = (
        SELECT count(*)
        FROM screenshots s
        WHERE s."screenshotBucketId" = sb.id
          AND s.metadata->'sdk'->>'name' = '@argos-ci/storybook'
      )
      FROM buckets
      WHERE sb.id = buckets.id
      RETURNING sb.id;
    `);
    if (result.rowCount === 0) {
      break;
    }
  }

  await knex.raw(`
    ALTER TABLE screenshot_buckets
    ADD CONSTRAINT chk_complete_true_storybookscreenshotcount_not_null
    CHECK (complete = false OR "storybookScreenshotCount" IS not NULL) NOT VALID
  `);

  await knex.raw(`
    ALTER TABLE screenshot_buckets
    VALIDATE CONSTRAINT chk_complete_true_storybookscreenshotcount_not_null
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
      ALTER TABLE screenshot_buckets DROP CONSTRAINT chk_complete_true_storybookscreenshotcount_not_null;
    `);
  await knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("storybookScreenshotCount");
  });
};

export const config = { transaction: false };
