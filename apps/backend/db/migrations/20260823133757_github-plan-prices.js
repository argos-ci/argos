/**
 * The Marketplace listing's monthly price, copied onto the GitHub plans.
 *
 * GitHub exposes no seller invoice API, so the marketplace book is priced by
 * plan: the revenue page multiplies the active marketplace subscriptions by
 * this price. Kept current by the `github-marketplace-prices` cron; null on
 * plans that are not marketplace listings.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("plans", (table) => {
    table.integer("githubMonthlyPriceCents");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("githubMonthlyPriceCents");
  });
};
