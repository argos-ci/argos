import { Account } from "../models";

/**
 * Spend limit thresholds in percentage.
 */
const THRESHOLDS = [50, 75, 100] as const;

export type SpendLimitThreshold = (typeof THRESHOLDS)[number];

/**
 * Get the spend limit threshold that has been reached for the first time.
 */
export async function getSpendLimitThreshold(
  account: Account,
): Promise<SpendLimitThreshold | null> {
  const manager = account.$getSubscriptionManager();

  if (account.meteredSpendLimitByPeriod === null) {
    return null;
  }

  const [currentCost, previousUsageCost] = await Promise.all([
    manager.getAdditionalScreenshotCost(),
    manager.getAdditionalScreenshotCost({ to: "previousUsage" }),
  ]);

  const spendLimit = account.meteredSpendLimitByPeriod;
  return THRESHOLDS.reduce<null | SpendLimitThreshold>((acc, threshold) => {
    const limitAtThreshold = spendLimit * (threshold / 100);
    if (
      // The highest threshold is reached.
      (acc === null || acc < threshold) &&
      previousUsageCost <= limitAtThreshold &&
      currentCost > limitAtThreshold
    ) {
      return threshold;
    }
    return acc;
  }, null);
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
