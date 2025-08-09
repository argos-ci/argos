/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("screenshot_diff_reviews", (table) => {
    table
      .bigInteger("buildReviewId")
      .notNullable()
      .comment("Build review to which the screenshot diff review is related");
    table.foreign("buildReviewId").references("build_reviews.id");

    table
      .bigInteger("screenshotDiffId")
      .notNullable()
      .comment("Screenshot diff to which the review is related");
    table.foreign("screenshotDiffId").references("screenshot_diffs.id");

    table.primary(["buildReviewId", "screenshotDiffId"]);

    table
      .enum("state", ["approved", "rejected"])
      .notNullable()
      .comment("State of the screenshot diff review");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("screenshot_diff_reviews");
};
