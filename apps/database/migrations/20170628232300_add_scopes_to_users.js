/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.jsonb("scopes");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.dropColumn("scopes");
  });
};
