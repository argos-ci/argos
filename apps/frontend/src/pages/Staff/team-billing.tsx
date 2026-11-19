import { CreditCardIcon } from "lucide-react";

import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

import { getPeriodFlatPrice, type PricedPlan } from "./pricing";

/**
 * What a team was billed over one period: the invoice the period closed on
 * when there is one, and otherwise the plan's own amount, its add-ons and the
 * screenshots it consumed beyond the quota.
 *
 * Both halves are taken in the period's own unit rather than brought back to a
 * month, unlike the rate the trial pipeline quotes. This answers what an
 * invoice came to, and a yearly subscription's invoice covers a year: dividing
 * it by twelve would report a figure Stripe never charged. The plan next to it
 * says which unit the figure is in.
 *
 * No subscription status to check, either. `billingPeriods` only ever holds the
 * periods Stripe actually invoices (trial periods and periods predating the
 * subscription are dropped server side), so a period being there is itself what
 * says it was billed, and a team with none was billed nothing.
 */
export function getPeriodAmount(
  period: { invoicedAmount?: number | null; additionalScreenshotsCost: number },
  staff: {
    flatPrice?: number | null;
    addOns: readonly { monthlyPrice: number }[];
  },
  plan: PricedPlan,
): number {
  return (
    period.invoicedAmount ??
    getPeriodFlatPrice(staff.flatPrice ?? null, plan) +
      staff.addOns.reduce((total, addOn) => total + addOn.monthlyPrice, 0) +
      period.additionalScreenshotsCost
  );
}

/**
 * `trialing_with_payment_method` spelled out is far wider than the column, and
 * the only part that adds anything over "trialing" is that a card is on file,
 * which a credit card icon says just as well.
 */
export function SubscriptionLabel(props: {
  status: string | null | undefined;
}) {
  const { status } = props;

  if (status === AccountSubscriptionStatus.TrialingWithPaymentMethod) {
    return (
      <span className="whitespace-nowrap">
        trialing
        <Tooltip content="Payment method filled">
          <CreditCardIcon
            className="text-success-low ml-1 inline-block size-4"
            aria-label="Payment method filled"
          />
        </Tooltip>
      </span>
    );
  }

  return <>{status ? status.replaceAll("_", " ") : "none"}</>;
}
