import type Stripe from "stripe";

import type { Account } from "@/database/models";

import { checkIsStripeConfigured, stripe, timestampToISOString } from "./index";

/** One charge the next invoice is shaping up to carry. */
type UpcomingInvoiceLine = {
  /** Stripe's own line id — stable within one preview, which is all it names. */
  id: string;
  description: string;
  /** In the currency's major unit, like every other amount here. */
  amount: number;
};

/**
 * What the next invoice would come to if it were raised now.
 *
 * Previewed from Stripe rather than computed here: the plan's recurring price
 * and the metered screenshots are only two of the things that end up on the
 * bill — add-ons, coupons, tax and mid-period proration all move the figure,
 * and Stripe is the only place they are all known.
 *
 * Amounts are in the currency's major unit, converted from the minor units
 * Stripe states, so the reader gets the figure it will actually be charged.
 */
export type UpcomingInvoice = {
  /** The lines added up, before discounts and tax. */
  subtotal: number;
  /** What coupons take off, as a positive amount. */
  discountAmount: number;
  taxAmount: number;
  /** Everything above, resolved — what the customer will owe. */
  total: number;
  currency: string;
  /** The stretch of service it will pay for. */
  periodStart: string;
  periodEnd: string;
  /** When Stripe expects to raise it, when it says. */
  date: string | null;
  /**
   * The lines behind `subtotal` — empty when Stripe did not embed them all,
   * since a breakdown that does not add up to its own total is worse than none.
   */
  lines: UpcomingInvoiceLine[];
};

/** Stripe states money in minor units; every amount we hand out is major. */
function toMajorUnit(minorUnitAmount: number): number {
  return minorUnitAmount / 100;
}

function sumAmounts(amounts: { amount: number }[] | null): number {
  if (!amounts) {
    return 0;
  }
  return amounts.reduce((sum, { amount }) => sum + amount, 0);
}

function readLines(invoice: Stripe.Invoice): UpcomingInvoiceLine[] {
  if (invoice.lines.has_more) {
    return [];
  }
  return invoice.lines.data.map((line) => ({
    id: line.id,
    // A line Stripe left undescribed still has to name itself; the only thing
    // known about it in that case is what it costs.
    description: line.description ?? "Other",
    amount: toMajorUnit(line.amount),
  }));
}

/**
 * The invoice the account's Stripe subscription is heading towards, or null
 * when there is none to preview.
 *
 * Null rather than an error for the legitimate ways an account has no next
 * invoice: it is not billed through Stripe, it has no active subscription, or
 * the subscription is set to end and Stripe has stopped planning invoices for
 * it (`invoice_upcoming_none`). Any other Stripe failure is left to surface —
 * a billing page that quietly reports "nothing to come" because Stripe timed
 * out is worse than one that says it could not check.
 */
export async function getUpcomingInvoice(
  account: Account,
): Promise<UpcomingInvoice | null> {
  // Development and test run against a placeholder key, where every preview
  // would come back an authentication error rather than a figure.
  if (!checkIsStripeConfigured()) {
    return null;
  }

  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();

  if (
    !subscription ||
    subscription.provider !== "stripe" ||
    !subscription.stripeSubscriptionId
  ) {
    return null;
  }

  const invoice = await previewInvoice(subscription.stripeSubscriptionId);
  if (!invoice) {
    return null;
  }

  return {
    subtotal: toMajorUnit(invoice.subtotal),
    discountAmount: toMajorUnit(sumAmounts(invoice.total_discount_amounts)),
    taxAmount: toMajorUnit(sumAmounts(invoice.total_taxes)),
    total: toMajorUnit(invoice.total),
    currency: invoice.currency,
    periodStart: timestampToISOString(invoice.period_start),
    periodEnd: timestampToISOString(invoice.period_end),
    date: invoice.next_payment_attempt
      ? timestampToISOString(invoice.next_payment_attempt)
      : null,
    lines: readLines(invoice),
  };
}

/** The Stripe error code for a subscription with no invoice left to raise. */
const NO_UPCOMING_INVOICE_CODE = "invoice_upcoming_none";

async function previewInvoice(
  stripeSubscriptionId: string,
): Promise<Stripe.Invoice | null> {
  try {
    return await stripe.invoices.createPreview({
      subscription: stripeSubscriptionId,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === NO_UPCOMING_INVOICE_CODE
    ) {
      return null;
    }
    throw error;
  }
}
