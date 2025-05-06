/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("github_installations", async (table) => {
    table.boolean("proxy").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_installations", async (table) => {
    table.dropColumn("proxy");
  });
};
