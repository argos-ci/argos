/**
 * Record what the add-ons cost on a subscription.
 *
 * `flatPrice` holds the plan's own line and nothing else, so a team paying for
 * GitHub SSO, SAML SSO or a static IP was priced below what Stripe invoices it.
 * Add-ons are separate subscription items, each with its own price, and they
 * add up to one amount per billing period, which is all a reader needs.
 *
 * `NULL` means the sync has not seen this subscription since the column
 * existed; a subscription without add-ons is synced to 0.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    table.float("addOnsPrice");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    table.dropColumn("addOnsPrice");
  });
};
