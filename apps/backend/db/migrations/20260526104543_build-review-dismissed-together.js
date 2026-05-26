/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    ALTER TABLE build_reviews
    ADD CONSTRAINT build_reviews_dismissed_together
    CHECK (("dismissedAt" IS NULL) = ("dismissedById" IS NULL));
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE build_reviews DROP CONSTRAINT build_reviews_dismissed_together;
  `);
};
