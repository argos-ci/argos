/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.integer("width");
    table.integer("height");
  });

  await knex.schema.table("screenshot_diffs", (table) => {
    table.bigInteger("fileId").index();
    table.foreign("fileId").references("files.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("files", (table) => {
    table.dropColumn("width");
    table.dropColumn("height");
  });

  await knex.schema.table("screenshot_diffs", (table) => {
    table.dropColumn("fileId");
  });
};
