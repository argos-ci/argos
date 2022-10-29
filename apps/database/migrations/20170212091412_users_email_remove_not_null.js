/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.raw('ALTER TABLE users ALTER COLUMN "email" DROP NOT NULL');
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.raw('ALTER TABLE users ALTER COLUMN "email" SET NOT NULL');
};
