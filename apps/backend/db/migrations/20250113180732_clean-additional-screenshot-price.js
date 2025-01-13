/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `update subscriptions set "additionalScreenshotPrice" = null where "additionalScreenshotPrice" is not null`,
  );
};

export const down = async () => {
  // no-op
};
