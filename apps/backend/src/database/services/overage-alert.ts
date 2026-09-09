import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { Account, type Subscription } from "../models";

export const OverageAlertThresholdSchema = z.union([
  z.literal(200),
  z.literal(500),
]);

type OverageAlertThreshold = z.infer<typeof OverageAlertThresholdSchema>;

/**
 * Additional screenshot costs, in the subscription currency, at which the
 * owners of an account without a spend limit are invited to set one up.
 */
const OVERAGE_ALERT_THRESHOLDS = [200, 500] satisfies OverageAlertThreshold[];

type OverageAlert = {
  threshold: OverageAlertThreshold;
  currency: NonNullable<Subscription["currency"]>;
};

/**
 * Claim the overage alert due for an account without a spend limit: the
 * highest threshold its additional screenshot cost has reached and that the
 * owners have not been alerted about yet. Claiming records the threshold on
 * the account, so each alert is sent once per account.
 *
 * Returns null when a spend limit is set (its own alerts take over), when no
 * new threshold is reached, or when another run claimed it first.
 */
export async function claimOverageAlert(
  account: Account,
): Promise<OverageAlert | null> {
  if (account.meteredSpendLimitByPeriod !== null) {
    return null;
  }

  const manager = account.$getSubscriptionManager();
  const [cost, subscription] = await Promise.all([
    manager.getAdditionalScreenshotCost(),
    manager.getActiveSubscription(),
  ]);

  const threshold =
    OVERAGE_ALERT_THRESHOLDS.findLast((candidate) => cost >= candidate) ?? null;
  // A claim only raises the value, so the loaded account, even stale, can hide
  // a claim but never invent one: skipping on it is safe, claiming on it is not.
  if (
    threshold === null ||
    (account.lastOverageAlertThreshold ?? 0) >= threshold
  ) {
    return null;
  }

  invariant(
    subscription?.currency,
    "A currency should be set if there is an additional screenshot cost",
  );

  // The loaded account may predate a claim by a concurrent run, so the update
  // makes the check itself: no row updated means the alert was already claimed.
  const claimed = await Account.query()
    .patch({ lastOverageAlertThreshold: threshold })
    .where("id", account.id)
    .whereNull("meteredSpendLimitByPeriod")
    .where((query) =>
      query
        .whereNull("lastOverageAlertThreshold")
        .orWhere("lastOverageAlertThreshold", "<", threshold),
    )
    .returning("id");

  if (claimed.length === 0) {
    return null;
  }

  return { threshold, currency: subscription.currency };
}
