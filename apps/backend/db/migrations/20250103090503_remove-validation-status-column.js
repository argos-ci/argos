/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshot_diffs", async (table) => {
    table.dropColumn("validationStatus");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshot_diffs", async (table) => {
    table.string("validationStatus").notNullable();
  });
};
