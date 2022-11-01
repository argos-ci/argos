/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.string("externalId").index();
    table.integer("batchCount");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("builds", (table) => {
    table.dropColumn("externalId");
    table.dropColumn("batchCount");
  });
};
