/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    'ALTER TABLE screenshot_diffs ALTER COLUMN "score" TYPE DECIMAL(10, 5)'
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    'ALTER TABLE screenshot_diffs ALTER COLUMN "score" TYPE INTEGER'
  );
};
