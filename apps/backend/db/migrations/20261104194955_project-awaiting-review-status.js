/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table
      .enum("awaitingReviewStatus", ["failure", "pending"])
      .notNullable()
      .defaultTo("failure");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("awaitingReviewStatus");
  });
};
