import type Stripe from "stripe";

import { StripeInvoice, StripeInvoiceSync } from "@/database/models";

import { stripe, timestampToISOString } from "./index";

/**
 * The columns a conflicting upsert refreshes — everything but `createdAt`,
 * which records when the mirror first saw the invoice and must survive
 * updates.
 */
const MERGE_COLUMNS = [
  "updatedAt",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "stripeCreatedAt",
  "status",
  "billingReason",
  "currency",
  "total",
  "totalExcludingTax",
  "totalTaxesAmount",
  "creditedAmountExcludingTax",
  "periodStart",
  "periodEnd",
];

/** How many rows a sweep writes per statement. */
const BATCH_SIZE = 100;

/**
 * The longest stretch one of the invoice's lines covers.
 *
 * Paginated when the embedded page is not the whole list: Stripe embeds at
 * most ten lines in a payload, and the year-long line of a conversion invoice
 * can sit past them — resolving from the first page alone would file the
 * contract as a true-up.
 */
async function resolveCoveredPeriod(
  invoice: Stripe.Invoice & { id: string },
): Promise<{ start: number; end: number } | null> {
  let period: { start: number; end: number } | null = null;
  const consider = (line: { period: { start: number; end: number } }) => {
    if (
      !period ||
      line.period.end - line.period.start > period.end - period.start
    ) {
      period = line.period;
    }
  };

  if (invoice.lines.has_more) {
    for await (const line of stripe.invoices.listLineItems(invoice.id, {
      limit: 100,
    })) {
      consider(line);
    }
  } else {
    for (const line of invoice.lines.data) {
      consider(line);
    }
  }
  return period;
}

/**
 * What the invoice's credit notes gave back, ex-tax.
 *
 * Read from the credit notes themselves rather than from the invoice's
 * pre/post_payment_credit_notes_amount rollups: those are tax-INCLUSIVE
 * totals, and subtracting them from the ex-tax base would take the credited
 * VAT off twice — a fully refunded taxed invoice would report negative.
 */
async function resolveCreditedAmount(
  invoice: Stripe.Invoice & { id: string },
): Promise<number> {
  if (
    invoice.pre_payment_credit_notes_amount +
      invoice.post_payment_credit_notes_amount ===
    0
  ) {
    return 0;
  }

  let credited = 0;
  for await (const creditNote of stripe.creditNotes.list({
    invoice: invoice.id,
    limit: 100,
  })) {
    if (creditNote.status === "void") {
      continue;
    }
    // The rare note stating no ex-tax total falls back to its tax-inclusive
    // one — conservative, and bounded by how rare it is.
    credited += creditNote.total_excluding_tax ?? creditNote.total;
  }
  return credited;
}

/**
 * What a Stripe invoice becomes in the mirror, or null for the ones not worth
 * a row: a draft is not an invoice yet — it changes freely and gets deleted —
 * and it will be mirrored when finalization makes it one.
 */
async function buildStripeInvoiceRow(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  const invoiceId = invoice.id;
  if (!invoiceId || !invoice.status || invoice.status === "draft") {
    return null;
  }
  if (!customerId) {
    return null;
  }

  const identified = Object.assign(invoice, { id: invoiceId });
  const subscription = invoice.parent?.subscription_details?.subscription;
  const [period, creditedAmountExcludingTax] = await Promise.all([
    resolveCoveredPeriod(identified),
    resolveCreditedAmount(identified),
  ]);

  return {
    stripeInvoiceId: invoiceId,
    stripeCustomerId: customerId,
    stripeSubscriptionId:
      typeof subscription === "string"
        ? subscription
        : (subscription?.id ?? null),
    stripeCreatedAt: timestampToISOString(invoice.created),
    status: invoice.status,
    billingReason: invoice.billing_reason,
    currency: invoice.currency,
    total: invoice.total,
    totalExcludingTax: invoice.total_excluding_tax,
    totalTaxesAmount:
      invoice.total_taxes == null
        ? null
        : invoice.total_taxes.reduce((sum, tax) => sum + tax.amount, 0),
    creditedAmountExcludingTax,
    periodStart: period ? timestampToISOString(period.start) : null,
    periodEnd: period ? timestampToISOString(period.end) : null,
  };
}

type StripeInvoiceRow = NonNullable<
  Awaited<ReturnType<typeof buildStripeInvoiceRow>>
>;

/**
 * Write invoices into the mirror, idempotently: webhooks arrive more than
 * once, and the reconciliation sweep re-reads what they already wrote.
 */
async function upsertStripeInvoiceRows(
  rows: StripeInvoiceRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  await StripeInvoice.query()
    .insert(rows)
    .onConflict("stripeInvoiceId")
    .merge(MERGE_COLUMNS);
}

/**
 * Re-read one invoice from Stripe into the mirror.
 *
 * Always a fresh retrieve, never the webhook's payload: Stripe guarantees no
 * event ordering and retries deliveries for days, so a payload is a snapshot
 * of unknown age — writing it could regress a paid row to open. The current
 * state, re-read on every signal, cannot.
 */
export async function refreshStripeInvoice(
  stripeInvoiceId: string,
): Promise<void> {
  let invoice: Stripe.Invoice;
  try {
    invoice = await stripe.invoices.retrieve(stripeInvoiceId);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "resource_missing"
    ) {
      // Deleted between the signal and the read — only drafts can be.
      await deleteStripeInvoice(stripeInvoiceId);
      return;
    }
    throw error;
  }

  const row = await buildStripeInvoiceRow(invoice);
  if (row) {
    await upsertStripeInvoiceRows([row]);
  }
}

/** Forget an invoice Stripe deleted — only drafts can be, but be thorough. */
export async function deleteStripeInvoice(
  stripeInvoiceId: string,
): Promise<void> {
  await StripeInvoice.query().delete().where({ stripeInvoiceId });
}

/**
 * Re-read a window of invoices from Stripe into the mirror, and record having
 * done so.
 *
 * The safety net under the webhooks, in three passes: the invoices created in
 * the window; the invoices — however old — whose credit notes were issued in
 * the window; and the mirrored rows still in a non-terminal status from before
 * the window, which a missed webhook may have left behind (an open invoice
 * paid or voided late). The completed window is recorded, which is how the
 * revenue reader proves the months it reports were ever covered.
 *
 * Used both for the initial backfill (a deep window) and the recurring
 * reconciliation cron (a shallow one).
 */
export async function syncStripeInvoices(options: {
  since: Date;
}): Promise<number> {
  const gte = Math.floor(options.since.getTime() / 1000);
  const seen = new Set<string>();
  let count = 0;

  let batch: StripeInvoiceRow[] = [];
  const flush = async () => {
    await upsertStripeInvoiceRows(batch);
    count += batch.length;
    batch = [];
  };

  for await (const invoice of stripe.invoices.list({
    created: { gte },
    limit: 100,
  })) {
    const row = await buildStripeInvoiceRow(invoice);
    if (!row) {
      continue;
    }
    // A page Stripe hands over twice — a cursor resumed, a listing drifting
    // under us — would put one invoice in a batch twice, and Postgres refuses
    // to update the same row twice in one statement.
    if (seen.has(row.stripeInvoiceId)) {
      continue;
    }
    seen.add(row.stripeInvoiceId);
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }
  await flush();

  for await (const creditNote of stripe.creditNotes.list({
    created: { gte },
    limit: 100,
  })) {
    const invoiceId =
      typeof creditNote.invoice === "string"
        ? creditNote.invoice
        : creditNote.invoice?.id;
    if (!invoiceId || seen.has(invoiceId)) {
      continue;
    }
    seen.add(invoiceId);
    await refreshStripeInvoice(invoiceId);
    count += 1;
  }

  const unsettled = await StripeInvoice.query()
    .select("stripeInvoiceId")
    .whereIn("status", ["open", "uncollectible"])
    .where("stripeCreatedAt", "<", options.since.toISOString());
  for (const row of unsettled) {
    if (seen.has(row.stripeInvoiceId)) {
      continue;
    }
    await refreshStripeInvoice(row.stripeInvoiceId);
    count += 1;
  }

  await StripeInvoiceSync.query().insert({
    sinceDate: options.since.toISOString(),
    completedAt: new Date().toISOString(),
  });

  return count;
}
