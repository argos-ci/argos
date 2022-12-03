/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.string("login");
  });
  await knex.raw("UPDATE users SET login = name");
  await knex.raw('ALTER TABLE users ALTER COLUMN "login" SET NOT NULL');
  await knex.raw('ALTER TABLE users ALTER COLUMN "name" DROP NOT NULL');
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("users", (table) => {
    table.dropColumn("login");
  });
  await knex.raw('ALTER TABLE users ALTER COLUMN "name" SET NOT NULL');
};
