import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { Account, type Subscription } from "../models";

/**
 * Usage, as a share of the included screenshots, at which the owners of a
 * flat-rate plan are warned, so they can act before builds are rejected.
 */
export const PLAN_LIMIT_WARNING_RATIO = 0.9;

export const PlanLimitAlertSchema = z.object({
  level: z.enum(Account.planLimitAlertLevels),
  /**
   * Where the flat-rate plan comes from, which decides how its owners get more
   * screenshots: on GitHub, through Stripe, by moving to a team, or through us.
   */
  planKind: z.enum(["github", "stripe", "hobby", "forced"]),
  planName: z.string(),
  includedScreenshots: z.number(),
  periodEndDate: z.string(),
});

type PlanLimitAlert = z.infer<typeof PlanLimitAlertSchema>;

function getPlanKind(
  account: Account,
  subscription: Subscription | null,
): PlanLimitAlert["planKind"] {
  if (account.forcedPlanId) {
    return "forced";
  }
  if (account.type === "user") {
    return "hobby";
  }
  invariant(subscription, "A team with a plan has an active subscription");
  return subscription.provider;
}

type PlanLimitClaim = {
  alert: PlanLimitAlert;
  /** What the claim wrote, so it can be given back if the alert is not sent. */
  claimedAt: string;
};

/**
 * Claim the plan limit alert due for an account on a flat-rate plan: the
 * highest level its usage has reached this billing period and that the owners
 * have not been alerted about yet in that period.
 *
 * Returns null on a usage-based plan (overage is billed, builds keep running),
 * when no new level is reached, or when another run claimed it first.
 */
export async function claimPlanLimitAlert(
  account: Account,
): Promise<PlanLimitClaim | null> {
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

  const [outOfCapacity, consumptionRatio, periodStart] = await Promise.all([
    manager.checkIsOutOfCapacity(),
    manager.getCurrentPeriodConsumptionRatio(),
    manager.getCurrentPeriodStartDate(),
  ]);

  // The rejection alert follows the check that rejects builds rather than a
  // ratio of its own, so it never says builds are rejected while they are not.
  const level =
    outOfCapacity === "flat-rate"
      ? "rejected"
      : consumptionRatio >= PLAN_LIMIT_WARNING_RATIO
        ? "warning"
        : null;
  if (level === null) {
    return null;
  }

  // Within a period, a warning is due only if nothing was sent yet, and a
  // rejection only if at most a warning was. A claim only raises the level, so
  // the loaded account, even stale, can hide a claim but never invent one:
  // skipping on it is safe, claiming on it is not.
  const { lastPlanLimitAlertAt, lastPlanLimitAlertLevel } = account;
  if (
    lastPlanLimitAlertAt !== null &&
    new Date(lastPlanLimitAlertAt) >= periodStart &&
    (level === "warning" || lastPlanLimitAlertLevel === "rejected")
  ) {
    return null;
  }

  // Everything the email needs is read before claiming, so a failure here
  // leaves the alert unclaimed for the next build to retry.
  const [periodEnd, subscription] = await Promise.all([
    manager.getCurrentPeriodEndDate(),
    manager.getActiveSubscription(),
  ]);
  const planKind = getPlanKind(account, subscription);

  // The update makes the check itself: no row updated means a concurrent run
  // already claimed this level in this period.
  const claimedAt = new Date().toISOString();
  const claimed = await Account.query()
    .patch({
      lastPlanLimitAlertLevel: level,
      lastPlanLimitAlertAt: claimedAt,
    })
    .where("id", account.id)
    .where((query) => {
      query
        .whereNull("lastPlanLimitAlertAt")
        .orWhere("lastPlanLimitAlertAt", "<", periodStart.toISOString());
      if (level === "rejected") {
        query.orWhere("lastPlanLimitAlertLevel", "warning");
      }
    })
    .returning("id");

  if (claimed.length === 0) {
    return null;
  }

  return {
    alert: {
      level,
      planKind,
      // Personal accounts run on the free plan, which the app calls Hobby.
      planName: planKind === "hobby" ? "Hobby" : plan.displayName,
      includedScreenshots,
      periodEndDate: periodEnd.toISOString(),
    },
    claimedAt,
  };
}

/**
 * Give back a claim whose alert could not be sent, so that the next build or
 * upload tries again. It writes back the values of the account the claim was
 * made from, and only while the claim is still the latest one.
 */
export async function releasePlanLimitAlert(
  account: Account,
  claim: PlanLimitClaim,
): Promise<void> {
  await Account.query()
    .patch({
      lastPlanLimitAlertLevel: account.lastPlanLimitAlertLevel,
      lastPlanLimitAlertAt: account.lastPlanLimitAlertAt,
    })
    .where({
      id: account.id,
      lastPlanLimitAlertLevel: claim.alert.level,
      lastPlanLimitAlertAt: claim.claimedAt,
    });
}
