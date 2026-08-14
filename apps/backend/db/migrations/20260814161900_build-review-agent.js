/**
 * Record which coding agent submitted a review, when one did.
 *
 * The comment a review carries already records this, but a review does not need
 * a body — approving with no words at all is the common case, and that leaves
 * nothing to attribute. The reviewers list is where a team looks to see who
 * signed off, so the fact that an agent did it belongs on the review itself.
 *
 * Same shape as `comments.agent`: a plain string holding an id from the curated
 * registry in `src/agent/registry.ts` (or `unknown`), not a foreign key.
 * `NULL` means a person reviewed directly — including an automatic review,
 * which Argos submits itself and marks with `automatic`.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.string("agent");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.dropColumn("agent");
  });
};
