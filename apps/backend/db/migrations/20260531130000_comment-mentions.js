/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("comment_mentions", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("commentId").notNullable();
    table.foreign("commentId").references("comments.id").onDelete("CASCADE");

    // Discriminator for the kind of entity being mentioned. Only "user" is wired
    // up for now; the other columns exist so adding build/test/diff mentions
    // later is a code-only change.
    table.string("type").notNullable();

    table.bigInteger("mentionedUserId");
    table.foreign("mentionedUserId").references("users.id").onDelete("CASCADE");

    table.bigInteger("mentionedBuildId");
    table
      .foreign("mentionedBuildId")
      .references("builds.id")
      .onDelete("CASCADE");

    table.bigInteger("mentionedTestId");
    table.foreign("mentionedTestId").references("tests.id").onDelete("CASCADE");

    table.bigInteger("mentionedScreenshotDiffId");
    table
      .foreign("mentionedScreenshotDiffId")
      .references("screenshot_diffs.id")
      .onDelete("CASCADE");

    // A given target is mentioned at most once per comment.
    table.unique(["commentId", "mentionedUserId"]);
    table.unique(["commentId", "mentionedBuildId"]);
    table.unique(["commentId", "mentionedTestId"]);
    table.unique(["commentId", "mentionedScreenshotDiffId"]);

    // "Comments where I'm mentioned", most recent first (future mentions inbox).
    table.index(["mentionedUserId", "createdAt"]);
  });

  // Exactly one target column must be set, and it must match the discriminator.
  await knex.raw(`
    ALTER TABLE comment_mentions
    ADD CONSTRAINT comment_mentions_single_target
    CHECK (
      (
        (CASE WHEN "mentionedUserId" IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN "mentionedBuildId" IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN "mentionedTestId" IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN "mentionedScreenshotDiffId" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1
      AND (type = 'user') = ("mentionedUserId" IS NOT NULL)
      AND (type = 'build') = ("mentionedBuildId" IS NOT NULL)
      AND (type = 'test') = ("mentionedTestId" IS NOT NULL)
      AND (type = 'screenshotDiff') = ("mentionedScreenshotDiffId" IS NOT NULL)
    );
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("comment_mentions");
};
