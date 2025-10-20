/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.string("contentType");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.dropColumn("contentType");
  });
};
