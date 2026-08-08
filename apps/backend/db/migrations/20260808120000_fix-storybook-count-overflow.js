/**
 * A bucket's Storybook screenshots are a subset of its screenshots, so
 * `storybookScreenshotCount` can never exceed `screenshotCount`. Buckets
 * finalized while the two were counted by two separate queries can break that:
 * a screenshot inserted between the queries was seen by the second one only.
 * The neutral count derived from the pair (`screenshotCount -
 * storybookScreenshotCount`) then goes negative.
 *
 * Clamp the affected buckets back to the invariant. Batched to keep each
 * statement short rather than locking the table in one pass.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  while (true) {
    const result = await knex.raw(`
      WITH buckets AS (
        SELECT id
        FROM screenshot_buckets
        WHERE "storybookScreenshotCount" > "screenshotCount"
        LIMIT 1000
      )
      UPDATE screenshot_buckets sb
      SET "storybookScreenshotCount" = sb."screenshotCount"
      FROM buckets
      WHERE sb.id = buckets.id
      RETURNING sb.id;
    `);
    if (result.rowCount === 0) {
      break;
    }
  }
};

/**
 * The counts the buckets held were wrong; there is nothing to restore.
 */
export const down = async () => {};

export const config = { transaction: false };
