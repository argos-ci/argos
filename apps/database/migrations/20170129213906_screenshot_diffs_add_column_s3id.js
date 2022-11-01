/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("screenshot_diffs", (table) => {
    table.string("s3Id");
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("screenshot_diffs", (table) => {
    table.dropColumn("s3Id");
  });
};
