/**
 * Record what the plan itself costs on a subscription.
 *
 * Everything else about the pricing is already synced from Stripe — the
 * included screenshots, the price of an additional one — but the recurring
 * amount of the plan was not, so the only way to quote it was to hardcode it.
 * That works for the self-serve plans, whose price is published, and is wrong
 * by construction for a negotiated contract.
 *
 * Held per subscription rather than per plan for the same reason
 * `includedScreenshots` is: every enterprise contract shares one `plans` row
 * while each carries its own amount.
 *
 * The amount is per billing period and in the subscription's own currency, read
 * exactly as Stripe states it — the same convention as `includedScreenshots`,
 * which readers already interpret through `plans.interval`. `NULL` means the
 * sync has not seen this subscription since the column existed, or that it has
 * no Stripe price to read at all, as a GitHub subscription does.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    table.float("flatPrice");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    table.dropColumn("flatPrice");
  });
};
