/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("slack_channels", (table) => {
    table.boolean("archived").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("slack_channels", (table) => {
    table.dropColumn("archived");
  });
};
