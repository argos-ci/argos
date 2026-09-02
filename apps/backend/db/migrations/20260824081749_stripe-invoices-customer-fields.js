/**
 * What the mirror needs to show an invoice to the customer who was billed.
 *
 * The mirror was built for the revenue page, which only ever adds amounts up,
 * so it holds nothing that identifies one invoice to a human: the number that
 * reads on the document, and the two Stripe-hosted copies — the payment page
 * and the PDF. Reading them back from Stripe on every view would put an API
 * call in front of a page that is otherwise a single query, and the invoice
 * webhooks already refresh every row.
 *
 * The URLs are `text` rather than `string`: Stripe signs them with a token
 * whose length it does not commit to, and a truncated payment link is a
 * customer who cannot pay.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("stripe_invoices", (table) => {
    table.string("number");
    table.text("hostedInvoiceUrl");
    table.text("invoicePdfUrl");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("stripe_invoices", (table) => {
    table.dropColumn("number");
    table.dropColumn("hostedInvoiceUrl");
    table.dropColumn("invoicePdfUrl");
  });
};
