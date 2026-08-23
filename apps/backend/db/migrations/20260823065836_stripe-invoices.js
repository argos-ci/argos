/**
 * Mirror of the Stripe invoices the revenue page reads.
 *
 * Kept in sync by the Stripe webhooks plus a reconciliation sweep, so the page
 * costs a query instead of a paginated walk of Stripe on every view. Only the
 * fields the revenue arithmetic reads are mirrored; the invoice itself stays
 * in Stripe. Amounts are in the currency's minor unit, as Stripe states them.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("stripe_invoices", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("stripeInvoiceId").notNullable();
    table.unique("stripeInvoiceId");
    table.string("stripeCustomerId").notNullable().index();
    table.string("stripeSubscriptionId");
    // Stripe's own `created`, which is what files an invoice into a month.
    table.dateTime("stripeCreatedAt").notNullable().index();
    table.string("status").notNullable();
    table.string("billingReason");
    table.string("currency").notNullable();
    table.integer("total").notNullable();
    table.integer("totalExcludingTax");
    table.integer("totalTaxesAmount");
    table.integer("prePaymentCreditNotesAmount").notNullable();
    table.integer("postPaymentCreditNotesAmount").notNullable();
    // The longest stretch one of the invoice's lines covers, resolved at
    // ingest — what tells an annual bill from a true-up.
    table.dateTime("periodStart");
    table.dateTime("periodEnd");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("stripe_invoices");
};
