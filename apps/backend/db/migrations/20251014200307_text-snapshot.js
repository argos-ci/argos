/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.renameTable("screenshots", "artifacts");
  await knex.schema.renameTable("screenshot_diffs", "artifact_diffs");
  await knex.schema.renameTable("screenshot_diffs", "artifact_diffs");
  await knex.schema.renameTable(
    "screenshot_diff_reviews",
    "artifact_diff_reviews",
  );
  await knex.schema.renameTable("screenshot_buckets", "artifact_buckets");

  await knex.schema.table("artifacts", (table) => {
    table.renameColumn("screenshotBucketId", "artifactBucketId");
  });

  await knex.schema.table("artifact_diffs", (table) => {
    table.renameColumn("baseScreenshotId", "baseArtifactId");
    table.renameColumn("compareScreenshotId", "headArtifactId");
  });

  await knex.schema.table("artifact_diff_reviews", (table) => {
    table.renameColumn("screenshotDiffId", "artifactDiffId");
  });

  await knex.schema.table("artifact_buckets", (table) => {
    table.renameColumn("screenshotCount", "artifactCount");
    table.integer("snapshotCount");
  });

  await knex.schema.table("builds", (table) => {
    table.renameColumn("baseScreenshotBucketId", "baseArtifactBucketId");
    table.renameColumn("compareScreenshotBucketId", "headArtifactBucketId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.renameTable("artifacts", "screenshots");
  await knex.schema.renameTable("artifact_diffs", "screenshot_diffs");
  await knex.schema.renameTable(
    "artifact_diff_reviews",
    "screenshot_diff_reviews",
  );
  await knex.schema.renameTable("artifact_buckets", "screenshot_buckets");

  await knex.schema.table("screenshots", (table) => {
    table.renameColumn("artifactBucketId", "screenshotBucketId");
  });

  await knex.schema.table("screenshot_diffs", (table) => {
    table.renameColumn("baseArtifactId", "baseScreenshotId");
    table.renameColumn("headArtifactId", "compareScreenshotId");
  });

  await knex.schema.table("screenshot_diff_reviews", (table) => {
    table.renameColumn("artifactDiffId", "screenshotDiffId");
  });

  await knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("snapshotCount");
  });

  await knex.schema.table("builds", (table) => {
    table.renameColumn("baseArtifactBucketId", "baseScreenshotBucketId");
    table.renameColumn("headArtifactBucketId", "compareScreenshotBucketId");
  });
};
