/**
 * What was given back on the invoice's payments, tax included.
 *
 * Stripe keeps a refunded invoice `paid`: the refund lives on the charge, and
 * the "Refunded" badge its dashboard shows is derived from it. Existing rows
 * read 0 until the next deep sweep re-reads them.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("stripe_invoices", (table) => {
    table.integer("refundedAmount").notNullable().defaultTo(0);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("stripe_invoices", (table) => {
    table.dropColumn("refundedAmount");
  });
};
