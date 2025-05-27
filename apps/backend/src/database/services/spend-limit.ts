import { z } from "zod";

import { Account } from "../models";

export type SpendLimitThreshold = z.infer<typeof SpendLimitThresholdSchema>;

export const SpendLimitThresholdSchema = z.union([
  z.literal(50),
  z.literal(75),
  z.literal(100),
]);

/**
 * Spend limit thresholds in percentage.
 */
const SPEND_LIMIT_THRESHOLDS = [50, 75, 100] satisfies SpendLimitThreshold[];

/**
 * Get the spend limit threshold that has been reached for the first time.
 */
export async function getSpendLimitThreshold(input: {
  account: Account;
  /**
   * Take in account the previous usage to compare with the current usage.
   * Used to be sure that the threshold has been reached for the first time.
   * Not needed when it's trigerred by an action.
   */
  comparePreviousUsage: boolean;
}): Promise<SpendLimitThreshold | null> {
  const { account, comparePreviousUsage } = input;
  const manager = account.$getSubscriptionManager();

  if (account.meteredSpendLimitByPeriod === null) {
    return null;
  }

  const [currentCost, previousUsageCost] = await Promise.all([
    manager.getAdditionalScreenshotCost(),
    comparePreviousUsage
      ? manager.getAdditionalScreenshotCost({ to: "previousUsage" })
      : null,
  ]);

  const spendLimit = account.meteredSpendLimitByPeriod;
  return SPEND_LIMIT_THRESHOLDS.reduce<null | SpendLimitThreshold>(
    (acc, threshold) => {
      const limitAtThreshold = spendLimit * (threshold / 100);
      if (
        // The highest threshold is reached.
        (acc === null || acc < threshold) &&
        (previousUsageCost === null || previousUsageCost <= limitAtThreshold) &&
        currentCost > limitAtThreshold
      ) {
        return threshold;
      }
      return acc;
    },
    null,
  );
}

/**
 * Check if the account is blocked because the spend limit has been reached.
 */
export async function checkIsBlockedBySpendLimit(
  account: Account,
): Promise<boolean> {
  const manager = account.$getSubscriptionManager();

  if (
    account.meteredSpendLimitByPeriod === null ||
    !account.blockWhenSpendLimitIsReached
  ) {
    return false;
  }

  const currentCost = await manager.getAdditionalScreenshotCost();
  return currentCost > account.meteredSpendLimitByPeriod;
}
