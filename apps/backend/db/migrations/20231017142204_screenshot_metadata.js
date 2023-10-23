/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshots", async (table) => {
    table.jsonb("metadata");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", async (table) => {
    table.dropColumn("metadata");
  });
};
