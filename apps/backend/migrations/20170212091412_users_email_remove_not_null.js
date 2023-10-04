/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw('ALTER TABLE users ALTER COLUMN "email" DROP NOT NULL');
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw('ALTER TABLE users ALTER COLUMN "email" SET NOT NULL');
};
