/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.dateTime("dismissedAt");
    table.bigInteger("dismissedById").index();
    table.foreign("dismissedById").references("users.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.dropColumn("dismissedAt");
    table.dropColumn("dismissedById");
  });
};
