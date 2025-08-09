/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `ALTER TABLE build_reviews DROP CONSTRAINT build_reviews_state_check`,
  );
  await knex.raw(
    `ALTER TABLE build_reviews ADD CONSTRAINT build_reviews_state_check CHECK (state = ANY (ARRAY['approved'::text, 'rejected'::text]))`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE build_reviews DROP CONSTRAINT build_reviews_state_check`,
  );
  await knex.raw(
    `ALTER TABLE build_reviews ADD CONSTRAINT build_reviews_state_check CHECK (state = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))`,
  );
};
