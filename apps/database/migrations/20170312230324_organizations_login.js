/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.table("organizations", (table) => {
    table.string("login");
  });
  await knex.schema.raw("UPDATE organizations SET login = name");
  await knex.schema.raw(
    'ALTER TABLE organizations ALTER COLUMN "login" SET NOT NULL'
  );
  await knex.schema.raw(
    'ALTER TABLE organizations ALTER COLUMN "name" DROP NOT NULL'
  );
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.table("organizations", (table) => {
    table.dropColumn("login");
  });
  await knex.schema.raw(
    'ALTER TABLE organizations ALTER COLUMN "name" SET NOT NULL'
  );
};
