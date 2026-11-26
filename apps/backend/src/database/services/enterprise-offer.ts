import { invariant } from "@argos/util/invariant";

import { toEuros } from "@/stripe/revenue";

import { Account, Plan, Team, type Subscription } from "../models";
import { getSubscriptionAddOns } from "./add-ons";
import { getPeriodAmount } from "./period-amount";
import {
  checkIsBilledPeriod,
  getAccountBillings,
  getAdditionalScreenshotCost,
  getEstimatedPeriodAmount,
  getIncludedScreenshots,
} from "./period-usage";

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

type EnterpriseOfferClaim = { claimedAt: string };

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

/**
 * Claim the Enterprise offer email for a team on Pro at list prices whose
 * running billing period just reached the threshold, so it is sent while the
 * team can still switch, not with the invoice. Claiming records the date on
 * the account, so the email is sent once per account, ever.
 *
 * The period is priced as `getAccountBillings` prices it for the Billing card,
 * from the usage the build job or the media upload already counted: the email
 * goes out exactly when the card would show for the running period.
 *
 * Returns the claim, or null when it is not due or another run claimed it
 * first.
 */
export async function claimEnterpriseOffer(
  account: Account,
): Promise<EnterpriseOfferClaim | null> {
  if (
    account.enterpriseOfferSentAt !== null ||
    account.forcedPlanId !== null ||
    account.teamId === null
  ) {
    return null;
  }

  const manager = account.$getSubscriptionManager();
  const subscription = await manager.getActiveSubscription();
  const plan = subscription?.plan;
  if (!subscription || !plan || !checkIsListPricedPro(subscription)) {
    return null;
  }

  const [periodStart, totals, team] = await Promise.all([
    manager.getCurrentPeriodStartDate(),
    manager.getCurrentPeriodScreenshots(),
    Team.query().findById(account.teamId),
  ]);
  // A period still on the trial is never billed.
  if (!checkIsBilledPeriod({ from: periodStart, index: 0 }, subscription)) {
    return null;
  }
  const amount = getEstimatedPeriodAmount({
    flatPrice: subscription.flatPrice ?? 0,
    addOns: getSubscriptionAddOns(team, subscription),
    period: {
      additionalScreenshotCost: getAdditionalScreenshotCost({
        subscription,
        totals,
        included: getIncludedScreenshots(subscription, plan),
      }),
    },
  });
  if (amount < getThreshold(subscription.currency)) {
    return null;
  }

  // The loaded account may predate a claim by a concurrent run, so the update
  // makes the check itself: no row updated means the email was already claimed.
  const claimedAt = new Date().toISOString();
  const claimed = await Account.query()
    .patch({ enterpriseOfferSentAt: claimedAt })
    .where("id", account.id)
    .whereNull("enterpriseOfferSentAt")
    .returning("id");

  return claimed.length > 0 ? { claimedAt } : null;
}

/**
 * Give back a claim whose email could not be sent, so that the next build
 * tries again. Only this claim is given back, never a later one.
 */
export async function releaseEnterpriseOffer(
  account: Account,
  claim: EnterpriseOfferClaim,
): Promise<void> {
  await Account.query()
    .patch({ enterpriseOfferSentAt: null })
    .where({ id: account.id, enterpriseOfferSentAt: claim.claimedAt });
}
