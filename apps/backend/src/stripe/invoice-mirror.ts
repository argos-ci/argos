import type Stripe from "stripe";

import { StripeInvoice } from "@/database/models";

import { stripe } from "./index";

/**
 * What a Stripe invoice becomes in the mirror, or null for the ones not worth
 * a row: a draft is not an invoice yet — it changes freely and gets deleted —
 * and it will be mirrored when finalization makes it one.
 */
function buildStripeInvoiceRow(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!invoice.id || !invoice.status || invoice.status === "draft") {
    return null;
  }
  if (!customerId) {
    return null;
  }

  const subscription = invoice.parent?.subscription_details?.subscription;

  // The longest stretch one of the invoice's lines covers — resolved here
  // rather than at read time, so the reader never needs the lines back.
  let period: { start: number; end: number } | null = null;
  for (const line of invoice.lines.data) {
    if (
      !period ||
      line.period.end - line.period.start > period.end - period.start
    ) {
      period = line.period;
    }
  }

  return {
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId:
      typeof subscription === "string"
        ? subscription
        : (subscription?.id ?? null),
    // Stripe timestamps in whole seconds.
    stripeCreatedAt: new Date(invoice.created * 1000).toISOString(),
    status: invoice.status,
    billingReason: invoice.billing_reason,
    currency: invoice.currency,
    total: invoice.total,
    totalExcludingTax: invoice.total_excluding_tax,
    totalTaxesAmount:
      invoice.total_taxes === null
        ? null
        : invoice.total_taxes.reduce((sum, tax) => sum + tax.amount, 0),
    prePaymentCreditNotesAmount: invoice.pre_payment_credit_notes_amount,
    postPaymentCreditNotesAmount: invoice.post_payment_credit_notes_amount,
    periodStart: period ? new Date(period.start * 1000).toISOString() : null,
    periodEnd: period ? new Date(period.end * 1000).toISOString() : null,
  };
}

/**
 * Write one invoice into the mirror, idempotently: webhooks arrive more than
 * once and out of order, and the reconciliation sweep re-reads what the
 * webhooks already wrote.
 */
export async function upsertStripeInvoice(
  invoice: Stripe.Invoice,
): Promise<void> {
  const row = buildStripeInvoiceRow(invoice);
  if (!row) {
    return;
  }
  await StripeInvoice.query().insert(row).onConflict("stripeInvoiceId").merge();
}

/** Forget an invoice Stripe deleted — only drafts can be, but be thorough. */
export async function deleteStripeInvoice(
  stripeInvoiceId: string,
): Promise<void> {
  await StripeInvoice.query().delete().where({ stripeInvoiceId });
}

/**
 * Re-read a window of invoices from Stripe into the mirror.
 *
 * The safety net under the webhooks: a webhook missed during a downtime, or a
 * subscription created before the mirror existed, is caught by the next sweep.
 * Used both for the initial backfill (a deep window) and the recurring
 * reconciliation (a shallow one).
 */
export async function syncStripeInvoices(options: {
  since: Date;
}): Promise<number> {
  let count = 0;
  for await (const invoice of stripe.invoices.list({
    created: { gte: Math.floor(options.since.getTime() / 1000) },
    limit: 100,
  })) {
    await upsertStripeInvoice(invoice);
    count += 1;
  }
  return count;
}
