/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    'ALTER TABLE repositories ALTER COLUMN "organizationId" TYPE BIGINT'
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    'ALTER TABLE repositories ALTER COLUMN "organizationId" TYPE INTEGER'
  );
};
