import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";

import { Account, Plan, Subscription } from "../models";
import { computeAdditionalScreenshots } from "./additional-screenshots";

/** One billing period of an account, priced from the usage it accumulated. */
type BillingPeriodUsage = {
  from: Date;
  /** End of the period, or the moment it was read while still running. */
  to: Date;
  /** False while the period is still accumulating usage. */
  closed: boolean;
  /**
   * Cost of the screenshots consumed beyond the included quota over the
   * period, in the subscription's currency.
   */
  additionalScreenshotCost: number;
};

/**
 * Billing usage for one account, as needed to explain what it is about to pay.
 */
type AccountPeriodUsage = {
  /**
   * Share of Storybook screenshots in everything the account ever uploaded,
   * between 0 and 1. Null when it never uploaded a screenshot at all — an
   * undefined mix, which is not the same as an all-neutral one.
   */
  storybookRatio: number | null;
  /** Storybook screenshots uploaded since the account was created. */
  storybookCount: number;
  /**
   * Periods Stripe actually invoices, most recent first: the one still
   * running, then the closed ones. Empty while the account is on its trial,
   * whose usage is never billed.
   */
  billingPeriods: BillingPeriodUsage[];
};

/**
 * What an account is billed on, as needed to explain what it pays.
 *
 * The plan comes back even when there is nothing to price, because it is what
 * explains the absence: an account on a flat plan or on a granted one has no
 * overage of ours to quote, and saying which plan it is on is the difference
 * between an empty cell and an answer.
 */
export type AccountBilling = {
  /**
   * The forced plan when the account has been granted one, the active
   * subscription's plan otherwise, and null when it has neither. A personal
   * account's implicit free plan is not resolved here — this serves team
   * accounts.
   */
  plan: Plan | null;
  /**
   * Usage-based billing. Null when the plan is not usage-based: there is no
   * overage to compute and no period to compute it over, which is a different
   * answer from one that consumed nothing.
   */
  periodUsage: AccountPeriodUsage | null;
};

/**
 * Billing periods read per account: the one still running, and the one before
 * it.
 *
 * One closed period is what pricing an account needs — it is the settled figure
 * the trial pipeline reads — and every extra period multiplies the rows the
 * aggregate below scans.
 */
const READ_PERIOD_COUNT = 2;

/**
 * Slack allowed when placing a period against the moment billing began.
 *
 * Converting a trial opens a new Stripe period at the instant the trial ends,
 * so the boundary between the two is one moment recorded twice: once as
 * `trialEndDate`, once as `current_period_start`. Stripe rounds both to the
 * second and Argos re-derives the period start from the anniversary offset, so
 * the two can land a few seconds apart. Compared strictly, that is enough to
 * read the first billed period as part of the trial. Periods are a month long,
 * so an hour of slack cannot swallow a real one.
 */
const PERIOD_BOUNDARY_TOLERANCE = 60 * 60 * 1000;

/** A window of one account's usage, as fed to the aggregate below. */
type AccountPeriod = {
  accountId: string;
  index: number;
  from: Date;
  to: Date;
};

/** Screenshots uploaded over one window, split by the way they are billed. */
type ScreenshotTotals = {
  all: number;
  storybook: number;
};

/** What one account uploaded, per period and over its whole life. */
type AccountTotals = {
  periods: Map<number, ScreenshotTotals>;
  allTime: ScreenshotTotals;
};

const EMPTY_TOTALS: ScreenshotTotals = { all: 0, storybook: 0 };

/** A bucket's Storybook count, never above the bucket's own total. */
const CLAMPED_STORYBOOK_COUNT = `least(coalesce(sb."storybookScreenshotCount", 0), coalesce(sb."screenshotCount", 0))`;

/** Rows of `(accountId, index, from, to)` to join the usage tables against. */
function buildPeriodValues(periods: AccountPeriod[]) {
  return {
    sql: periods
      .map(() => `(?::bigint, ?::int, ?::timestamptz, ?::timestamptz)`)
      .join(", "),
    bindings: periods.flatMap((period) => [
      period.accountId,
      period.index,
      period.from.toISOString(),
      period.to.toISOString(),
    ]),
  };
}

/**
 * Sum screenshots per account and per period in a single pass.
 *
 * Every account has its own period boundaries — they follow the subscription's
 * anniversary, not the calendar — so the windows travel with the rows as a
 * `VALUES` list and each period's totals come out of a filtered aggregate. The
 * alternative is one query per account and per period, which is what this
 * exists to avoid.
 *
 * The joins are left joins throughout: an account whose projects never produced
 * a bucket still has to come back with zeros rather than vanish from the batch.
 */
async function getScreenshotTotals(
  periods: AccountPeriod[],
): Promise<Map<string, AccountTotals>> {
  // `accounts.id` is a bigint and the bindings arrive as strings, so the values
  // are cast explicitly — Postgres cannot infer the type of a bare parameter in
  // a `VALUES` list, and would refuse to join it against `projects."accountId"`.
  const values = buildPeriodValues(periods);

  const rows = (await knex
    .select("v.accountId", "v.index")
    .select(
      // `screenshotCount` is null until a bucket completes, and the billing
      // aggregate it mirrors sums it as-is rather than filtering incomplete
      // buckets out. Coalescing here keeps both sides on the same number.
      knex.raw(
        `coalesce(sum(sb."screenshotCount") filter (where sb."createdAt" >= v."from" and sb."createdAt" < v."to"), 0) as "periodAll"`,
      ),
      // A bucket's Storybook count is clamped to its total before being summed.
      // The two used to be counted by two separate queries, so buckets written
      // back then can hold more Storybook screenshots than screenshots, which
      // would make the neutral count negative. Mirrors
      // `Account.$getScreenshotCountBetween`.
      knex.raw(
        `coalesce(sum(${CLAMPED_STORYBOOK_COUNT}) filter (where sb."createdAt" >= v."from" and sb."createdAt" < v."to"), 0) as "periodStorybook"`,
      ),
      // Unfiltered, so every period of an account repeats the same lifetime
      // total. Read once per account below.
      knex.raw(`coalesce(sum(sb."screenshotCount"), 0) as "allTimeAll"`),
      knex.raw(
        `coalesce(sum(${CLAMPED_STORYBOOK_COUNT}), 0) as "allTimeStorybook"`,
      ),
    )
    .from(
      knex.raw(
        `(values ${values.sql}) as v("accountId", "index", "from", "to")`,
        values.bindings,
      ),
    )
    .leftJoin("projects as p", "p.accountId", "v.accountId")
    .leftJoin("screenshot_buckets as sb", "sb.projectId", "p.id")
    .groupBy("v.accountId", "v.index")) as unknown as {
    accountId: string | number;
    index: string | number;
    periodAll: string | number;
    periodStorybook: string | number;
    allTimeAll: string | number;
    allTimeStorybook: string | number;
  }[];

  // Media hangs off a project, like a bucket does, but it still cannot ride the
  // join above: joining two independent one-to-many tables in a single pass
  // multiplies their rows against each other. It is aggregated separately and
  // added in.
  const mediaUnits = await getMediaUnits(periods);

  const totalsByAccountId = new Map<string, AccountTotals>();
  for (const row of rows) {
    const accountId = String(row.accountId);
    const index = Number(row.index);
    const media = mediaUnits.get(accountId);
    const totals = totalsByAccountId.get(accountId) ?? {
      periods: new Map<number, ScreenshotTotals>(),
      // Media is never Storybook, so it lifts the totals without touching
      // either Storybook count — the neutral half absorbs it.
      allTime: {
        all: (Number(row.allTimeAll) || 0) + (media?.allTime ?? 0),
        storybook: Number(row.allTimeStorybook) || 0,
      },
    };
    totals.periods.set(index, {
      all: (Number(row.periodAll) || 0) + (media?.periods.get(index) ?? 0),
      storybook: Number(row.periodStorybook) || 0,
    });
    totalsByAccountId.set(accountId, totals);
  }

  return totalsByAccountId;
}

/**
 * Screenshot units charged by standalone media uploads, per account and per
 * period, over the same windows as the bucket totals.
 */
async function getMediaUnits(
  periods: AccountPeriod[],
): Promise<Map<string, { periods: Map<number, number>; allTime: number }>> {
  const values = buildPeriodValues(periods);

  const rows = (await knex
    .select("v.accountId", "v.index")
    .select(
      knex.raw(
        `coalesce(sum(mv."billedUnits") filter (where mv."uploadedAt" >= v."from" and mv."uploadedAt" < v."to"), 0) as "period"`,
      ),
      knex.raw(`coalesce(sum(mv."billedUnits"), 0) as "allTime"`),
    )
    .from(
      knex.raw(
        `(values ${values.sql}) as v("accountId", "index", "from", "to")`,
        values.bindings,
      ),
    )
    // Media reaches the account through its project, exactly as a bucket does —
    // which is what makes a project transfer carry its billing with it.
    .leftJoin("projects as p", "p.accountId", "v.accountId")
    .leftJoin("media as m", "m.projectId", "p.id")
    // Units live on the version, because every version is an upload and each one
    // stores its own bytes. Only uploads that completed are billed, which is what
    // `uploadedAt` records.
    .leftJoin("media_versions as mv", (join) => {
      join.on("mv.mediaId", "m.id").onNotNull("mv.uploadedAt");
    })
    .groupBy("v.accountId", "v.index")) as unknown as {
    accountId: string | number;
    index: string | number;
    period: string | number;
    allTime: string | number;
  }[];

  const unitsByAccountId = new Map<
    string,
    { periods: Map<number, number>; allTime: number }
  >();
  for (const row of rows) {
    const accountId = String(row.accountId);
    const units = unitsByAccountId.get(accountId) ?? {
      periods: new Map<number, number>(),
      allTime: Number(row.allTime) || 0,
    };
    units.periods.set(Number(row.index), Number(row.period) || 0);
    unitsByAccountId.set(accountId, units);
  }

  return unitsByAccountId;
}

/** Whether a period is one Stripe invoices. */
function checkIsBilledPeriod(
  period: AccountPeriod,
  subscription: Subscription,
): boolean {
  const from = period.from.getTime();

  // Stripe never bills usage consumed during a trial, and converting one opens
  // a fresh period at the instant it ends — so no period straddles that
  // boundary, and every period before it is trial usage.
  if (subscription.trialEndDate) {
    const trialEnd = new Date(subscription.trialEndDate).getTime();
    if (from < trialEnd - PERIOD_BOUNDARY_TOLERANCE) {
      return false;
    }
  }

  // The period still running is real whatever the rest says: it is the one
  // usage is accruing into right now.
  if (period.index === 0) {
    return true;
  }

  // Boundaries are walked back from an anniversary, so they keep going past the
  // point where the subscription itself begins. A closed period from before it
  // existed is an invoice that was never sent.
  const createdAt = new Date(subscription.createdAt).getTime();
  return from >= createdAt - PERIOD_BOUNDARY_TOLERANCE;
}

/**
 * What a batch of accounts is billed on, in a handful of queries whatever the
 * batch size.
 *
 * Every requested account gets an entry, so a caller never has to tell a missing
 * answer from an empty one.
 */
export async function getAccountBillings(
  accounts: Account[],
): Promise<Map<string, AccountBilling>> {
  const result = new Map<string, AccountBilling>();

  if (accounts.length === 0) {
    return result;
  }

  // A forced plan overrides whatever subscription rows the account may still
  // carry — the subscription manager reports no active subscription at all for
  // it. These are the granted plans, open source above all: they read as
  // `active` everywhere while billing nothing, so a leftover subscription must
  // not earn them a price here. The plan itself is still reported: it is what
  // explains why the account is billed nothing.
  const subscribedAccounts: Account[] = [];
  const forcedPlanIds = new Set<string>();
  for (const account of accounts) {
    if (account.forcedPlanId === null) {
      subscribedAccounts.push(account);
    } else {
      forcedPlanIds.add(account.forcedPlanId);
    }
  }

  if (forcedPlanIds.size > 0) {
    const forcedPlans = await Plan.query().findByIds([...forcedPlanIds]);
    const forcedPlanById = new Map(forcedPlans.map((plan) => [plan.id, plan]));
    for (const account of accounts) {
      if (account.forcedPlanId !== null) {
        result.set(account.id, {
          plan: forcedPlanById.get(account.forcedPlanId) ?? null,
          periodUsage: null,
        });
      }
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
  const periodsByAccountId = new Map<string, AccountPeriod[]>();

  for (const account of subscribedAccounts) {
    const subscription = subscriptionByAccountId.get(account.id);
    if (!subscription?.plan?.usageBased) {
      result.set(account.id, {
        plan: subscription?.plan ?? null,
        periodUsage: null,
      });
      continue;
    }
    // Contiguous windows, newest first: each period runs until the next one
    // opens, and the one still running until now.
    const starts = subscription.getPeriodStarts(
      now,
      subscription.plan.interval,
      READ_PERIOD_COUNT,
    );
    periodsByAccountId.set(
      account.id,
      starts.map((from, index) => ({
        accountId: account.id,
        index,
        from,
        to: starts[index - 1] ?? now,
      })),
    );
  }

  const periods = [...periodsByAccountId.values()].flat();

  if (periods.length === 0) {
    return result;
  }

  const totalsByAccountId = await getScreenshotTotals(periods);

  for (const [accountId, accountPeriods] of periodsByAccountId) {
    const subscription = subscriptionByAccountId.get(accountId);
    const plan = subscription?.plan;
    const totals = totalsByAccountId.get(accountId);
    invariant(
      subscription && plan && totals,
      "every account with periods has a usage-based subscription and totals",
    );

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
      plan,
      periodUsage: {
        storybookRatio:
          totals.allTime.all > 0
            ? totals.allTime.storybook / totals.allTime.all
            : null,
        storybookCount: totals.allTime.storybook,
        billingPeriods: accountPeriods
          .filter((period) => checkIsBilledPeriod(period, subscription))
          .map((period) => {
            const periodTotals =
              totals.periods.get(period.index) ?? EMPTY_TOTALS;
            // The included quota resets at every period, so the overage is
            // computed period by period rather than off a running total.
            const additional =
              subscription.includedScreenshots === null
                ? null
                : computeAdditionalScreenshots({
                    neutral: periodTotals.all - periodTotals.storybook,
                    storybook: periodTotals.storybook,
                    included: subscription.includedScreenshots,
                  });

            return {
              from: period.from,
              to: period.to,
              closed: period.index > 0,
              additionalScreenshotCost: additional
                ? additional.neutral * price.neutral +
                  additional.storybook * price.storybook
                : 0,
            };
          }),
      },
    });
  }

  return result;
}
