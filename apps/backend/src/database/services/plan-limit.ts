import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { Account, type Subscription } from "../models";

export const PlanLimitThresholdSchema = z.union([
  z.literal(90),
  z.literal(110),
]);

type PlanLimitThreshold = z.infer<typeof PlanLimitThresholdSchema>;

/**
 * Where a flat-rate plan comes from, which decides how its owners get more
 * screenshots: on GitHub, through Stripe, by moving to a team, or through us.
 */
export const PlanLimitPlanKindSchema = z.enum([
  "github",
  "stripe",
  "hobby",
  "forced",
]);

type PlanLimitPlanKind = z.infer<typeof PlanLimitPlanKindSchema>;

type PlanLimitAlert = {
  threshold: PlanLimitThreshold;
  planKind: PlanLimitPlanKind;
  planName: string;
  includedScreenshots: number;
  periodEndDate: string;
};

function getPlanKind(
  account: Account,
  subscription: Subscription | null,
): PlanLimitPlanKind {
  if (account.forcedPlanId) {
    return "forced";
  }
  if (account.type === "user") {
    return "hobby";
  }
  invariant(subscription, "A team with a plan has an active subscription");
  return subscription.provider;
}

/**
 * Claim the plan limit alert due for an account on a flat-rate plan: the
 * highest threshold its usage has reached this billing period and that the
 * owners have not been alerted about yet in that period.
 *
 * Returns null on a usage-based plan (overage is billed, builds keep running),
 * when no new threshold is reached, or when another run claimed it first.
 */
export async function claimPlanLimitAlert(
  account: Account,
): Promise<PlanLimitAlert | null> {
  const manager = account.$getSubscriptionManager();
  const [plan, includedScreenshots] = await Promise.all([
    manager.getPlan(),
    manager.getIncludedScreenshots(),
  ]);

  // With nothing included, the consumption ratio is pinned at 1 whatever the
  // usage, and a team without a plan has its builds rejected for that reason.
  if (!plan || plan.usageBased || includedScreenshots === 0) {
    return null;
  }

  const [outOfCapacity, consumptionRatio, periodStart, periodEnd] =
    await Promise.all([
      manager.checkIsOutOfCapacity(),
      manager.getCurrentPeriodConsumptionRatio(),
      manager.getCurrentPeriodStartDate(),
      manager.getCurrentPeriodEndDate(),
    ]);

  // The 110% alert follows the check that rejects builds rather than a ratio of
  // its own, so it never says builds are rejected while they are not.
  const threshold: PlanLimitThreshold | null = (() => {
    if (outOfCapacity === "flat-rate") {
      return 110;
    }
    return consumptionRatio >= 0.9 ? 90 : null;
  })();

  if (threshold === null) {
    return null;
  }

  // A claim only raises the threshold within a period, so the loaded account,
  // even stale, can hide a claim but never invent one: skipping on it is safe,
  // claiming on it is not.
  const claimedThisPeriod =
    account.lastPlanLimitAlertAt !== null &&
    new Date(account.lastPlanLimitAlertAt) >= periodStart;
  if (
    claimedThisPeriod &&
    (account.lastPlanLimitAlertThreshold ?? 0) >= threshold
  ) {
    return null;
  }

  // The update makes the check itself: no row updated means a concurrent run
  // already claimed this threshold in this period.
  const claimed = await Account.query()
    .patch({
      lastPlanLimitAlertThreshold: threshold,
      lastPlanLimitAlertAt: new Date().toISOString(),
    })
    .where("id", account.id)
    .where((query) =>
      query
        .whereNull("lastPlanLimitAlertAt")
        .orWhere("lastPlanLimitAlertAt", "<", periodStart.toISOString())
        .orWhere("lastPlanLimitAlertThreshold", "<", threshold),
    )
    .returning("id");

  if (claimed.length === 0) {
    return null;
  }

  const subscription = await manager.getActiveSubscription();
  const planKind = getPlanKind(account, subscription);

  return {
    threshold,
    planKind,
    // Personal accounts run on the free plan, which the app calls Hobby.
    planName: planKind === "hobby" ? "Hobby" : plan.displayName,
    includedScreenshots,
    periodEndDate: periodEnd.toISOString(),
  };
}
