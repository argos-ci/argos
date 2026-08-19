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
   * Periods Stripe actually invoices, most recent first: the one still
   * running, then the closed ones. Empty while the account is on its trial,
   * whose usage is never billed.
   */
  billingPeriods: BillingPeriodUsage[];
};

/**
 * The Storybook mix of everything an account ever uploaded.
 *
 * Deliberately not part of `AccountBilling`: it is measured over the whole
 * history rather than over a window, so it cannot be bounded the way the
 * periods are, and it costs a scan of every bucket the account ever produced.
 * Read on its own so a caller that does not show it does not pay for it — the
 * team directory prices 150 accounts without ever asking for the mix.
 */
export type AccountStorybookTotals = {
  /**
   * Share of Storybook screenshots in everything the account ever uploaded,
   * between 0 and 1. Null when it never uploaded a screenshot at all — an
   * undefined mix, which is not the same as an all-neutral one.
   */
  ratio: number | null;
  /** Storybook screenshots uploaded since the account was created. */
  count: number;
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
   * What the plan costs per billing period on this account's subscription, in
   * that subscription's currency — the negotiated amount for a contract, the
   * published one otherwise. Null when Stripe has never been asked for it, or
   * has nothing to answer: see `Subscription.flatPrice`.
   */
  flatPrice: number | null;
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

/** What one account uploaded, per period. */
type AccountTotals = Map<number, ScreenshotTotals>;

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
    )
    .from(
      knex.raw(
        `(values ${values.sql}) as v("accountId", "index", "from", "to")`,
        values.bindings,
      ),
    )
    .leftJoin("projects as p", "p.accountId", "v.accountId")
    // Bounded in the join rather than only in the aggregate above: the filters
    // there are applied after the rows are read, so on their own the scan still
    // walks every bucket the project ever produced. Each row carries its own
    // boundary, so this reads `v."from"` rather than one minimum for the whole
    // batch — a single yearly subscription in the batch would otherwise push
    // that minimum two years back and unbound everyone else.
    .leftJoin("screenshot_buckets as sb", (join) => {
      join
        .on("sb.projectId", "p.id")
        .andOn(knex.raw(`sb."createdAt" >= v."from"`));
    })
    .groupBy("v.accountId", "v.index")) as unknown as {
    accountId: string | number;
    index: string | number;
    periodAll: string | number;
    periodStorybook: string | number;
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
    const totals =
      totalsByAccountId.get(accountId) ?? new Map<number, ScreenshotTotals>();
    totals.set(index, {
      // Media is never Storybook, so it lifts the total without touching the
      // Storybook count — the neutral half absorbs it.
      all: (Number(row.periodAll) || 0) + (media?.get(index) ?? 0),
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
): Promise<Map<string, Map<number, number>>> {
  const values = buildPeriodValues(periods);

  const rows = (await knex
    .select("v.accountId", "v.index")
    .select(
      knex.raw(
        `coalesce(sum(mv."billedUnits") filter (where mv."uploadedAt" >= v."from" and mv."uploadedAt" < v."to"), 0) as "period"`,
      ),
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
    // Deliberately not bounded by a date, unlike the buckets above: a version
    // can be uploaded long after the media row it hangs off was created — that
    // is what replacing a recording is — so narrowing the media by its own date
    // would drop uploads that fall squarely inside the window. Only the version
    // below carries a date the window can be applied to, which leaves this join
    // reading every media row of the account.
    .leftJoin("media as m", "m.projectId", "p.id")
    // Units live on the version, because every version is an upload and each one
    // stores its own bytes. Only uploads that completed are billed, which is what
    // `uploadedAt` records.
    .leftJoin("media_versions as mv", (join) => {
      join
        .on("mv.mediaId", "m.id")
        .onNotNull("mv.uploadedAt")
        .andOn(knex.raw(`mv."uploadedAt" >= v."from"`));
    })
    .groupBy("v.accountId", "v.index")) as unknown as {
    accountId: string | number;
    index: string | number;
    period: string | number;
  }[];

  const unitsByAccountId = new Map<string, Map<number, number>>();
  for (const row of rows) {
    const accountId = String(row.accountId);
    const units = unitsByAccountId.get(accountId) ?? new Map<number, number>();
    units.set(Number(row.index), Number(row.period) || 0);
    unitsByAccountId.set(accountId, units);
  }

  return unitsByAccountId;
}

/**
 * The Storybook mix of a batch of accounts, over everything they ever uploaded.
 *
 * Unbounded by nature — the mix is a property of the whole history — so this
 * reads every bucket and every media version the accounts ever produced. That is
 * expensive on exactly the accounts that matter, which is why it is its own
 * function behind its own loader rather than a column of the period aggregate:
 * a caller that does not show the mix never runs it.
 */
export async function getAccountStorybookTotals(
  accountIds: string[],
): Promise<Map<string, AccountStorybookTotals>> {
  const result = new Map<string, AccountStorybookTotals>();

  if (accountIds.length === 0) {
    return result;
  }

  const [bucketRows, mediaRows] = await Promise.all([
    knex
      .select("p.accountId")
      .select(
        knex.raw(`coalesce(sum(sb."screenshotCount"), 0) as "all"`),
        knex.raw(`coalesce(sum(${CLAMPED_STORYBOOK_COUNT}), 0) as "storybook"`),
      )
      .from("projects as p")
      .leftJoin("screenshot_buckets as sb", "sb.projectId", "p.id")
      .whereIn("p.accountId", accountIds)
      .groupBy("p.accountId") as unknown as Promise<
      {
        accountId: string | number;
        all: string | number;
        storybook: string | number;
      }[]
    >,
    knex
      .select("p.accountId")
      .select(knex.raw(`coalesce(sum(mv."billedUnits"), 0) as "all"`))
      .from("projects as p")
      .leftJoin("media as m", "m.projectId", "p.id")
      .leftJoin("media_versions as mv", (join) => {
        join.on("mv.mediaId", "m.id").onNotNull("mv.uploadedAt");
      })
      .whereIn("p.accountId", accountIds)
      .groupBy("p.accountId") as unknown as Promise<
      { accountId: string | number; all: string | number }[]
    >,
  ]);

  // Media is never Storybook, so it lifts the denominator without touching the
  // numerator — the neutral half absorbs it.
  const mediaByAccountId = new Map(
    mediaRows.map((row) => [String(row.accountId), Number(row.all) || 0]),
  );

  for (const accountId of accountIds) {
    result.set(accountId, { ratio: null, count: 0 });
  }

  for (const row of bucketRows) {
    const accountId = String(row.accountId);
    const storybook = Number(row.storybook) || 0;
    const all = (Number(row.all) || 0) + (mediaByAccountId.get(accountId) ?? 0);
    result.set(accountId, {
      ratio: all > 0 ? storybook / all : null,
      count: storybook,
    });
  }

  return result;
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
          // A granted plan is not paid for, so there is no amount to report
          // even when a leftover subscription still carries one.
          flatPrice: null,
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
        flatPrice: subscription?.flatPrice ?? null,
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
      flatPrice: subscription.flatPrice,
      periodUsage: {
        billingPeriods: accountPeriods
          .filter((period) => checkIsBilledPeriod(period, subscription))
          .map((period) => {
            const periodTotals = totals.get(period.index) ?? EMPTY_TOTALS;
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
