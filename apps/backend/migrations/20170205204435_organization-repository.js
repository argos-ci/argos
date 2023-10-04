/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.integer("organizationId").index();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.dropColumn("organizationId");
  });
};
