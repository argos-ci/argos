/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.jsonb("parentCommits");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.dropColumn("parentCommits");
  });
};
