/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.dateTime("deletedAt").nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.dropColumn("deletedAt");
  });
};
