/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.string("baselineBranch").defaultTo("master").notNullable();
  });
  await knex.schema.raw(
    'ALTER TABLE repositories ALTER COLUMN "baselineBranch" DROP DEFAULT'
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("repositories", (table) => {
    table.dropColumn("baselineBranch");
  });
};
