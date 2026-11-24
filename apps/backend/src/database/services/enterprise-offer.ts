import { invariant } from "@argos/util/invariant";

import { Account, Plan, Team } from "../models";
import { getSubscriptionAddOns } from "./add-ons";
import { getPeriodAmount } from "./period-amount";
import {
  getAccountBillings,
  getEstimatedPeriodAmount,
  type AccountBilling,
} from "./period-usage";

/**
 * What one billing period of a Pro plan comes to, before tax and in the
 * subscription's currency, from which the team is offered an Enterprise plan:
 * past it, volume pricing costs the team less than Pro does.
 */
const ENTERPRISE_OFFER_THRESHOLD = 1500;

/**
 * Whether the Billing page offers the team an Enterprise plan: it is on Pro
 * and its running or its previous billing period reached the threshold. The
 * previous one keeps the offer up while a new period starts again from zero.
 */
function checkIsEnterpriseOfferShown(billing: AccountBilling): boolean {
  if (!billing.plan || !Plan.checkIsProPlan(billing.plan)) {
    return false;
  }
  return (["current", "previous"] as const).some((period) => {
    const amount = getPeriodAmount(billing, period);
    return amount !== null && amount >= ENTERPRISE_OFFER_THRESHOLD;
  });
}

export async function getIsEnterpriseOfferShown(
  account: Account,
): Promise<boolean> {
  const billings = await getAccountBillings([account]);
  const billing = billings.get(account.id);
  invariant(billing, "every requested account has a billing");
  return checkIsEnterpriseOfferShown(billing);
}

/**
 * Claim the Enterprise offer email for a team on Pro whose running billing
 * period just reached the threshold, so it is sent while the team can still
 * switch, not with the invoice. Claiming records the date on the account, so
 * the email is sent once per account, ever.
 *
 * Returns false when it is not due, or when another run claimed it first.
 */
export async function claimEnterpriseOffer(account: Account): Promise<boolean> {
  if (
    account.enterpriseOfferSentAt !== null ||
    account.forcedPlanId !== null ||
    account.teamId === null
  ) {
    return false;
  }

  const manager = account.$getSubscriptionManager();
  const subscription = await manager.getActiveSubscription();
  if (
    !subscription?.plan ||
    !Plan.checkIsProPlan(subscription.plan) ||
    // Stripe never bills the usage of a trial.
    subscription.status === "trialing"
  ) {
    return false;
  }

  const [additionalScreenshotCost, team] = await Promise.all([
    manager.getAdditionalScreenshotCost(),
    Team.query().findById(account.teamId),
  ]);
  const amount = getEstimatedPeriodAmount({
    flatPrice: subscription.flatPrice ?? 0,
    addOns: getSubscriptionAddOns(team, subscription),
    period: { additionalScreenshotCost },
  });
  if (amount < ENTERPRISE_OFFER_THRESHOLD) {
    return false;
  }

  // The loaded account may predate a claim by a concurrent run, so the update
  // makes the check itself: no row updated means the email was already claimed.
  const claimed = await Account.query()
    .patch({ enterpriseOfferSentAt: new Date().toISOString() })
    .where("id", account.id)
    .whereNull("enterpriseOfferSentAt")
    .returning("id");

  return claimed.length > 0;
}
