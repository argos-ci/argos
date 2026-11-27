import { invariant } from "@argos/util/invariant";

import { toEuros } from "@/stripe/revenue";

import { Plan, type Account, type Subscription } from "../models";
import { getPeriodAmount } from "./period-amount";
import { getAccountBillings } from "./period-usage";

/**
 * What one billing period of a Pro plan comes to, before tax, from which the
 * team is offered an Enterprise plan: past it, volume pricing costs the team
 * less than Pro does.
 */
const ENTERPRISE_OFFER_THRESHOLD_USD = 1500;

/**
 * The threshold in the currency the subscription bills in. Euros convert at the
 * fixed rate the revenue page uses, so a team billed in euros is offered
 * Enterprise at the same spend as one billed in dollars.
 */
function getThreshold(currency: Subscription["currency"]): number {
  return currency === "eur"
    ? toEuros({ amount: ENTERPRISE_OFFER_THRESHOLD_USD, currency: "usd" })
    : ENTERPRISE_OFFER_THRESHOLD_USD;
}

/**
 * What the Pro plan charges per screenshot past its quota, as the pricing page
 * lists it, the same in dollars and euros. Change them with the pricing page:
 * a subscription billed below either one is read as negotiated.
 */
const PRO_LIST_PRICES = {
  screenshot: 0.004,
  storybookScreenshot: 0.0015,
};

/**
 * Whether the subscription is on Pro at its list prices. A team billed below
 * them has a negotiated deal: it already talked to sales, and offering it a
 * better price than Pro would read as if it had not.
 */
function checkIsListPricedPro(subscription: Subscription): boolean {
  if (!subscription.plan || !Plan.checkIsProPlan(subscription.plan)) {
    return false;
  }
  const screenshotPrice = subscription.additionalScreenshotPrice;
  // A Storybook screenshot without a price of its own is billed as any other.
  const storybookScreenshotPrice =
    subscription.additionalStorybookScreenshotPrice ?? screenshotPrice;
  return (
    (screenshotPrice === null ||
      screenshotPrice >= PRO_LIST_PRICES.screenshot) &&
    (storybookScreenshotPrice === null ||
      storybookScreenshotPrice >= PRO_LIST_PRICES.storybookScreenshot)
  );
}

/**
 * Whether the Billing page offers the team an Enterprise plan: it is on Pro at
 * list prices and its running or its previous billing period reached the
 * threshold. The previous one keeps the offer up while a new period starts
 * again from zero.
 */
export async function getIsEnterpriseOfferShown(
  account: Account,
): Promise<boolean> {
  // Telling a Pro team apart costs one query, pricing its periods an aggregate.
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();
  if (!subscription || !checkIsListPricedPro(subscription)) {
    return false;
  }
  const billings = await getAccountBillings([account]);
  const billing = billings.get(account.id);
  invariant(billing, "every requested account has a billing");
  if (!billing.plan || !Plan.checkIsProPlan(billing.plan)) {
    return false;
  }
  const threshold = getThreshold(subscription.currency);
  return (["current", "previous"] as const).some((period) => {
    const amount = getPeriodAmount(billing, period);
    return amount !== null && amount >= threshold;
  });
}
