/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.string("fingerprint", 80);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.dropColumn("fingerprint");
  });
};
