import type { StripeInvoice } from "@/database/models";
import { getInvoiceRevenue } from "@/stripe/revenue";

import { getEstimatedPeriodAmount, type AccountBilling } from "./period-usage";

/**
 * What a team billed over one period, or null when it billed nothing.
 *
 * The flat price is taken in the period's own unit, exactly as the staff column
 * that displays it does — a yearly subscription's period is a year. This exists
 * so the staff ordering, the figure on screen and the Billing Enterprise card
 * come out of one rule; a team ordered above another has to read higher than it too.
 *
 * A closed period reads the invoice it closed on when the mirror holds one:
 * that is what was billed, add-ons and all, where the sum below is only an
 * estimate of it.
 */
export function getPeriodAmount(
  billing: AccountBilling,
  period: "previous" | "current",
): number | null {
  const { periodUsage, plan } = billing;

  if (!periodUsage || !plan) {
    return null;
  }

  const billed =
    period === "previous"
      ? periodUsage.billingPeriods.find((item) => item.closed)
      : periodUsage.billingPeriods.find((item) => !item.closed);

  if (!billed) {
    return null;
  }

  return (
    getInvoicedAmount(billed) ??
    getEstimatedPeriodAmount({
      // Null when Stripe was never asked for the amount. Ordered as nothing
      // rather than guessed at: the guess belongs to the display, which says it
      // is one.
      flatPrice: billing.flatPrice ?? 0,
      addOns: billing.addOns,
      period: billed,
    })
  );
}

/**
 * What Stripe invoiced for a period, before tax and net of credit notes, as the
 * revenue page counts it. Null when no invoice of it is mirrored.
 */
export function getInvoicedAmount(period: {
  invoice: StripeInvoice | null;
}): number | null {
  return period.invoice ? getInvoiceRevenue(period.invoice).amount : null;
}
