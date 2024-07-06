/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.string("baseName", 1024);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.dropColumn("baseName");
  });
};
