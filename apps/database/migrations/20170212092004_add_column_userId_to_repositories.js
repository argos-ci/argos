/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.bigInteger("userId").index();
    table.foreign("userId").references("users.id");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.dropColumn("userId");
  });
};
