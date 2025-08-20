/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dateTime("finalizedAt").nullable();
    table.dateTime("concludedAt").nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.dropColumn("finalizedAt");
    table.dropColumn("concludedAt");
  });
};
