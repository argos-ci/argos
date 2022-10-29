/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.enum("type", ["reference", "check", "orphan"]);
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("type");
  });
};
