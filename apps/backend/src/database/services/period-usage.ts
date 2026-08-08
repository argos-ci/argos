import { knex } from "@/database";

import { Account, Subscription } from "../models";
import { computeAdditionalScreenshots } from "./additional-screenshots";

/**
 * Billing usage for one account, as needed to explain what it is about to pay.
 */
export type AccountPeriodUsage = {
  /**
   * Cost of the screenshots consumed beyond the included quota since the
   * current period started, in the subscription's currency.
   */
  additionalScreenshotCost: number;
  /**
   * Share of Storybook screenshots in everything the account ever uploaded,
   * between 0 and 1. Null when it never uploaded a screenshot at all — an
   * undefined mix, which is not the same as an all-neutral one.
   */
  storybookRatio: number | null;
  /** Storybook screenshots uploaded since the account was created. */
  storybookCount: number;
};

/** Usage of an account on a usage-based plan that has yet to upload anything. */
const EMPTY_PERIOD_USAGE: AccountPeriodUsage = {
  additionalScreenshotCost: 0,
  storybookRatio: null,
  storybookCount: 0,
};

/**
 * Screenshot totals for one account: over the current billing period, which is
 * what gets invoiced, and over its whole life, which is what describes its mix.
 */
type ScreenshotTotals = {
  periodAll: number;
  periodStorybook: number;
  allTimeAll: number;
  allTimeStorybook: number;
};

/** A bucket's Storybook count, never above the bucket's own total. */
const CLAMPED_STORYBOOK_COUNT = `least(coalesce(sb."storybookScreenshotCount", 0), coalesce(sb."screenshotCount", 0))`;

/**
 * Sum screenshots per account in a single pass.
 *
 * Every account has its own period start — it follows the subscription's
 * anniversary, not the calendar — so the boundaries travel with the rows as a
 * `VALUES` list and the period totals come out of a filtered aggregate. The
 * alternative is one query per account, which is what this exists to avoid.
 *
 * The joins are left joins throughout: an account whose projects never produced
 * a bucket still has to come back with zeros rather than vanish from the batch.
 */
async function getScreenshotTotals(
  periodStartByAccountId: Map<string, Date>,
): Promise<Map<string, ScreenshotTotals>> {
  const entries = [...periodStartByAccountId];

  // `accounts.id` is a bigint and the bindings arrive as strings, so the values
  // are cast explicitly — Postgres cannot infer the type of a bare parameter in
  // a `VALUES` list, and would refuse to join it against `projects."accountId"`.
  const values = entries.map(() => `(?::bigint, ?::timestamptz)`).join(", ");
  const bindings = entries.flatMap(([accountId, periodStart]) => [
    accountId,
    periodStart.toISOString(),
  ]);

  const rows = (await knex
    .select("v.accountId")
    .select(
      // `screenshotCount` is null until a bucket completes, and the billing
      // aggregate it mirrors sums it as-is rather than filtering incomplete
      // buckets out. Coalescing here keeps both sides on the same number.
      knex.raw(
        `coalesce(sum(sb."screenshotCount") filter (where sb."createdAt" >= v."periodStart"), 0) as "periodAll"`,
      ),
      // A bucket's Storybook count is clamped to its total before being summed.
      // The two used to be counted by two separate queries, so buckets written
      // back then can hold more Storybook screenshots than screenshots, which
      // would make the neutral count negative. Mirrors
      // `Account.$getScreenshotCountBetween`.
      knex.raw(
        `coalesce(sum(${CLAMPED_STORYBOOK_COUNT}) filter (where sb."createdAt" >= v."periodStart"), 0) as "periodStorybook"`,
      ),
      knex.raw(`coalesce(sum(sb."screenshotCount"), 0) as "allTimeAll"`),
      knex.raw(
        `coalesce(sum(${CLAMPED_STORYBOOK_COUNT}), 0) as "allTimeStorybook"`,
      ),
    )
    .from(
      knex.raw(`(values ${values}) as v("accountId", "periodStart")`, bindings),
    )
    .leftJoin("projects as p", "p.accountId", "v.accountId")
    .leftJoin("screenshot_buckets as sb", "sb.projectId", "p.id")
    .groupBy("v.accountId")) as unknown as {
    accountId: string | number;
    periodAll: string | number;
    periodStorybook: string | number;
    allTimeAll: string | number;
    allTimeStorybook: string | number;
  }[];

  return new Map(
    rows.map((row) => [
      String(row.accountId),
      {
        periodAll: Number(row.periodAll) || 0,
        periodStorybook: Number(row.periodStorybook) || 0,
        allTimeAll: Number(row.allTimeAll) || 0,
        allTimeStorybook: Number(row.allTimeStorybook) || 0,
      },
    ]),
  );
}

/**
 * Billing usage for a batch of accounts, in two queries whatever the batch size.
 *
 * An account maps to `null` when it is not on a usage-based plan: it has no
 * overage to compute and no period to compute it over, which is a different
 * answer from one that consumed nothing. Callers that render money need to tell
 * the two apart, so the distinction is kept here rather than flattened to zero.
 */
export async function getAccountPeriodUsages(
  accounts: Account[],
): Promise<Map<string, AccountPeriodUsage | null>> {
  const result = new Map<string, AccountPeriodUsage | null>();

  if (accounts.length === 0) {
    return result;
  }

  // A forced plan overrides whatever subscription rows the account may still
  // carry — the subscription manager reports no active subscription at all for
  // it. These are the granted plans, open source above all: they read as
  // `active` everywhere while billing nothing, so a leftover subscription must
  // not earn them a price here.
  const subscribedAccounts: Account[] = [];
  for (const account of accounts) {
    if (account.forcedPlanId === null) {
      subscribedAccounts.push(account);
    } else {
      result.set(account.id, null);
    }
  }

  if (subscribedAccounts.length === 0) {
    return result;
  }

  // Deliberately not filtered on `plan.usageBased`: this has to pick the same
  // subscription as `Account.getActiveSubscription()`, which selects on
  // `includedScreenshots` alone. Narrowing to usage-based plans before the
  // `DISTINCT ON` would let an account holding both a flat and a usage-based
  // active subscription resolve one subscription here and the other there —
  // pricing the row against a plan it is not billed on. The plan is checked
  // below instead, once the same winner has been picked.
  const subscriptions = await Subscription.query()
    .select("subscriptions.*")
    .withGraphFetched("plan")
    .joinRelated("plan")
    .whereIn(
      "subscriptions.accountId",
      subscribedAccounts.map((account) => account.id),
    )
    .whereRaw("?? < now()", "subscriptions.startDate")
    .whereIn("subscriptions.status", ["active", "trialing", "past_due"])
    .where((query) =>
      query
        .whereNull("subscriptions.endDate")
        .orWhereRaw("?? >= now()", "subscriptions.endDate"),
    )
    .distinctOn("subscriptions.accountId")
    .orderBy("subscriptions.accountId")
    .orderBy("plan.includedScreenshots", "DESC");

  const subscriptionByAccountId = new Map(
    subscriptions.map((subscription) => [subscription.accountId, subscription]),
  );

  const now = new Date();
  const periodStartByAccountId = new Map<string, Date>();

  for (const account of subscribedAccounts) {
    const subscription = subscriptionByAccountId.get(account.id);
    if (!subscription?.plan?.usageBased) {
      result.set(account.id, null);
      continue;
    }
    periodStartByAccountId.set(
      account.id,
      subscription.getLastResetDate(now, subscription.plan.interval),
    );
  }

  if (periodStartByAccountId.size === 0) {
    return result;
  }

  const totalsByAccountId = await getScreenshotTotals(periodStartByAccountId);

  for (const accountId of periodStartByAccountId.keys()) {
    const subscription = subscriptionByAccountId.get(accountId);
    const totals = totalsByAccountId.get(accountId);

    if (!subscription || !totals) {
      result.set(accountId, EMPTY_PERIOD_USAGE);
      continue;
    }

    const additional =
      subscription.includedScreenshots === null
        ? null
        : computeAdditionalScreenshots({
            neutral: totals.periodAll - totals.periodStorybook,
            storybook: totals.periodStorybook,
            included: subscription.includedScreenshots,
          });

    // Storybook screenshots fall back to the neutral price when they have none
    // of their own, exactly as the per-account cost does.
    const price = {
      neutral: subscription.additionalScreenshotPrice ?? 0,
      storybook:
        subscription.additionalStorybookScreenshotPrice ??
        subscription.additionalScreenshotPrice ??
        0,
    };

    result.set(accountId, {
      additionalScreenshotCost: additional
        ? additional.neutral * price.neutral +
          additional.storybook * price.storybook
        : 0,
      storybookRatio:
        totals.allTimeAll > 0
          ? totals.allTimeStorybook / totals.allTimeAll
          : null,
      storybookCount: totals.allTimeStorybook,
    });
  }

  return result;
}
