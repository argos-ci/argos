/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table
      .enum("deploymentAuth", ["public", "domain-private", "private"])
      .notNullable()
      .defaultTo("domain-private");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("deploymentAuth");
  });
};
