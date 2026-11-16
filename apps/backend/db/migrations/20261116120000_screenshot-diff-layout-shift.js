/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshot_diffs", (table) => {
    table.jsonb("layoutShift");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshot_diffs", (table) => {
    table.dropColumn("layoutShift");
  });
};
