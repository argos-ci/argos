/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.string("token").index();
  });
  await knex.schema.table("screenshot_buckets", (table) => {
    table
      .bigInteger("repositoryId")
      .notNullable()
      .references("repositories.id");
  });
  await knex.schema.table("builds", (table) => {
    table
      .bigInteger("repositoryId")
      .notNullable()
      .references("repositories.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.dropColumn("token");
  });
  await knex.schema.table("screenshot_buckets", (table) => {
    table.dropColumn("repositoryId");
  });
  await knex.schema.table("builds", (table) => {
    table.dropColumn("repositoryId");
  });
};
