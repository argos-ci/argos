/**
 * Let a comment target a media, so a reviewer can pin feedback to a spot on an
 * uploaded screenshot and an agent can read it back and act on it.
 *
 * Follows the precedent set when comments were extended from builds to tests: a
 * third nullable target column, and the exclusivity constraint widened to cover
 * it. Thread subscriptions need no change at all — they key on
 * `(commentId, userId)`, not on what the comment is posted on.
 *
 * The one thing that is genuinely new: `anchor` used to require a screenshot
 * diff, and now a media satisfies it too. That is what makes a comment pinned at
 * a normalized (x, y) on an uploaded image work, which is why the feature needs
 * no annotation tooling of its own.
 *
 * A thread belongs to the **media**, not to the version it was written on, so it
 * survives the re-upload it asked for. `mediaVersionId` records which version the
 * author was actually looking at: a pin at (0.62, 0.34) described a spot on those
 * bytes, and drawing it on a later version — reshot at a different size, or fixed
 * so the thing is no longer there — points at the wrong pixel and reads as a
 * false claim about the current image.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("comments", (table) => {
    table.bigInteger("mediaId");
    table.foreign("mediaId").references("media.id").onDelete("CASCADE");
    table.index(["mediaId", "createdAt"]);

    // Set null rather than cascade: a version can be purged by retention while
    // the discussion it started is still worth keeping.
    table.bigInteger("mediaVersionId");
    table
      .foreign("mediaVersionId")
      .references("media_versions.id")
      .onDelete("SET NULL");
  });

  // A version reference only means something on a media comment.
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_media_version_requires_media
    CHECK ("mediaVersionId" IS NULL OR "mediaId" IS NOT NULL);
  `);

  await knex.raw(`ALTER TABLE comments DROP CONSTRAINT comments_target_xor;`);
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_target_xor
    CHECK (num_nonnulls("buildId", "testId", "mediaId") = 1);
  `);

  // An anchor now points either at a screenshot diff (inside a build) or at a
  // media. It still cannot float free of both.
  await knex.raw(
    `ALTER TABLE comments DROP CONSTRAINT comments_anchor_requires_diff;`,
  );
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_anchor_requires_target
    CHECK (
      anchor IS NULL
      OR "screenshotDiffId" IS NOT NULL
      OR "mediaId" IS NOT NULL
    );
  `);

  // A media comment is a discussion thread on a file: a review draft and a diff
  // anchor have no meaning outside a build, exactly as for a test comment.
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_media_target_scope
    CHECK (
      "mediaId" IS NULL
      OR ("buildReviewId" IS NULL AND "screenshotDiffId" IS NULL)
    );
  `);
};

/**
 * Destructive: restoring the two-target exclusivity means there can be no media
 * comments, so every comment posted on a media is deleted — along with its
 * reactions, mentions and thread subscriptions, which cascade. Re-running `up`
 * does not bring them back, so export the rows first if they matter.
 *
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE comments DROP CONSTRAINT comments_media_target_scope;`,
  );
  await knex.raw(
    `ALTER TABLE comments DROP CONSTRAINT comments_anchor_requires_target;`,
  );
  await knex.raw(`ALTER TABLE comments DROP CONSTRAINT comments_target_xor;`);

  await knex("comments").whereNotNull("mediaId").delete();

  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_target_xor
    CHECK (num_nonnulls("buildId", "testId") = 1);
  `);
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_anchor_requires_diff
    CHECK (anchor IS NULL OR "screenshotDiffId" IS NOT NULL);
  `);

  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("mediaId");
  });
};
