/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex("build_reviews").where("state", "dismissed").update({
    state: "commented",
  });

  await knex.raw(`
    ALTER TABLE build_reviews
    ADD CONSTRAINT build_reviews_state_check_new
    CHECK (state = ANY (ARRAY['approved'::text, 'rejected'::text, 'commented'::text, 'pending'::text])) NOT VALID
  `);

  await knex.raw(`
    ALTER TABLE build_reviews DROP CONSTRAINT build_reviews_state_check
  `);

  await knex.raw(`
    ALTER TABLE build_reviews VALIDATE CONSTRAINT build_reviews_state_check_new
  `);

  await knex.raw(`
    ALTER TABLE build_reviews RENAME CONSTRAINT build_reviews_state_check_new TO build_reviews_state_check
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE build_reviews
    ADD CONSTRAINT build_reviews_state_check_new
    CHECK (state = ANY (ARRAY['approved'::text, 'rejected'::text, 'commented'::text, 'dismissed'::text, 'pending'::text])) NOT VALID
  `);

  await knex.raw(`
    ALTER TABLE build_reviews DROP CONSTRAINT build_reviews_state_check
  `);

  await knex.raw(`
    ALTER TABLE build_reviews VALIDATE CONSTRAINT build_reviews_state_check_new
  `);

  await knex.raw(`
    ALTER TABLE build_reviews RENAME CONSTRAINT build_reviews_state_check_new TO build_reviews_state_check
  `);
};

export const config = { transaction: false };
