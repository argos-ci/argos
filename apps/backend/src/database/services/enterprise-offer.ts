import { invariant } from "@argos/util/invariant";

import { Account, Plan, Team } from "../models";
import { getSubscriptionAddOns } from "./add-ons";
import { getPeriodAmount } from "./period-amount";
import {
  checkIsBilledPeriod,
  getAccountBillings,
  getAdditionalScreenshotCost,
  getEstimatedPeriodAmount,
  getIncludedScreenshots,
  type AccountBilling,
} from "./period-usage";

/**
 * What one billing period of a Pro plan comes to, before tax and in the
 * subscription's currency, from which the team is offered an Enterprise plan:
 * past it, volume pricing costs the team less than Pro does.
 */
const ENTERPRISE_OFFER_THRESHOLD = 1500;

type EnterpriseOfferClaim = { claimedAt: string };

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
 * The period is priced as `getAccountBillings` prices it for the Billing card,
 * from the usage the build job already counted: the email goes out exactly
 * when the card would show for the running period.
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
  if (!subscription || !plan || !Plan.checkIsProPlan(plan)) {
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
  if (amount < ENTERPRISE_OFFER_THRESHOLD) {
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
