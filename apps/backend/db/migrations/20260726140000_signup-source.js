/**
 * @param {import("knex").Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.enum("signupSource", [
      "search_engine",
      "ai_assistant",
      "social_media",
      "github",
      "word_of_mouth",
      "other",
    ]);
    // Only meaningful alongside the `other` source, which is a free-text answer.
    table.string("signupSourceDetail");
    // Kept apart from the source itself: a null source with a date set records
    // a question that was asked and skipped, which is a different fact from one
    // that was never asked — and it is what stops the welcome page from asking
    // a second time.
    table.dateTime("signupSourceAskedAt");
  });
};

/**
 * @param {import("knex").Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("signupSource");
    table.dropColumn("signupSourceDetail");
    table.dropColumn("signupSourceAskedAt");
  });
};
