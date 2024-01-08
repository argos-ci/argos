/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table
      .enum("summaryCheck", ["always", "auto", "never"])
      .notNullable()
      .defaultTo("auto");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("summaryCheck");
  });
};
