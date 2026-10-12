import { invariant } from "@argos/util/invariant";
import { sumBy } from "lodash-es";

import { getChangelogNews } from "@/changelog/news";
import { sendEmailTemplate } from "@/email/send-email-template";
import { createJob } from "@/job-core";

import { Account, Subscription, Team, TeamUser } from "../models";
import { getMonthlyReportActivity } from "./monthly-report-activity";
import {
  checkIsBilledPeriod,
  getAdditionalScreenshotCost,
  getIncludedScreenshots,
  getScreenshotTotals,
  type ScreenshotTotals,
} from "./period-usage";

/**
 * Closed months the months to come are projected from, weighted 3, 2 and 1
 * from the most recent back, so a change of pace shows in the next report
 * instead of being diluted over the whole window.
 */
const PROJECTION_WINDOW = 3;

/** Closed months the report of a monthly plan shows. */
const MONTHLY_PLAN_HISTORY = 6;

/** Accounts read per page when enqueueing the reports. */
const ACCOUNT_BATCH_SIZE = 100;

/**
 * Slack allowed when matching the monthly anniversaries against the yearly
 * one. The yearly anniversary is an offset from January 1, so it moves by a
 * day across a February 29 while the monthly one does not. Two days cannot
 * swallow a month.
 */
const ANNIVERSARY_TOLERANCE = 2 * 24 * 60 * 60 * 1000;

/**
 * The report of a team on a usage-based plan, as of `now`: the months it
 * shows, the one that closed last and the one before it. Null when it has
 * none: not on such a plan, or before its first month closed.
 *
 * On a yearly plan, the months are the term: twelve monthly anniversaries
 * rather than the yearly one, which drifts by a day across a February 29. On
 * a monthly plan, they are the last billed ones.
 */
async function getReportTerm(account: Account, now: Date) {
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();
  // The subscription Argos meters on can differ from the one that matched the
  // plan query: an account holding several picks the largest plan.
  if (
    !subscription?.plan ||
    subscription.status === "trialing" ||
    !subscription.plan.usageBased
  ) {
    return null;
  }
  const includedScreenshots = getIncludedScreenshots(
    subscription,
    subscription.plan,
  );
  // Without a quota, there is no plan to measure the usage against.
  if (includedScreenshots === 0) {
    return null;
  }

  // Indexes count months back from the one holding `now`.
  const monthStart = (index: number) =>
    subscription.getResetDateAt(now, "month", index);
  const currentIndex = subscription.getCurrentPeriodIndex(now, "month");
  /** The report of a month is due once the next one opens, at its `to`. */
  const reportedMonth = {
    from: monthStart(currentIndex + 1),
    to: monthStart(currentIndex),
  };
  const previousMonth = {
    from: monthStart(currentIndex + 2),
    to: monthStart(currentIndex + 1),
  };

  if (subscription.plan.interval === "month") {
    const months: { startsAt: Date; endsAt: Date }[] = [];
    for (
      let index = currentIndex + MONTHLY_PLAN_HISTORY;
      index > currentIndex;
      index--
    ) {
      const startsAt = monthStart(index);
      // Trial months, and the ones before the subscription, were not billed.
      if (
        checkIsBilledPeriod(
          { from: startsAt, index: index - currentIndex },
          subscription,
        )
      ) {
        months.push({ startsAt, endsAt: monthStart(index - 1) });
      }
    }
    // The month that just closed was not billed: no report for it.
    if (months.at(-1)?.startsAt.getTime() !== reportedMonth.from.getTime()) {
      return null;
    }
    return {
      interval: "month" as const,
      subscription,
      includedScreenshots,
      months,
      closedCount: months.length,
      termStartsAt: reportedMonth.from,
      termEndsAt: reportedMonth.to,
      reportedMonth,
      previousMonth,
    };
  }

  const termStartsAt = subscription.getLastResetDate(now, "year");
  let firstIndex = currentIndex;
  while (
    monthStart(firstIndex + 1).getTime() >=
    termStartsAt.getTime() - ANNIVERSARY_TOLERANCE
  ) {
    firstIndex++;
  }
  if (firstIndex === currentIndex) {
    return null;
  }

  // A cancelled subscription stops at its end date: usually the end of the
  // term, earlier when it was cancelled at a set date.
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  const months: { startsAt: Date; endsAt: Date }[] = [];
  for (let index = firstIndex; index > firstIndex - 12; index--) {
    const startsAt = monthStart(index);
    if (endDate && startsAt >= endDate) {
      break;
    }
    const endsAt = monthStart(index - 1);
    months.push({
      startsAt,
      endsAt: endDate && endDate < endsAt ? endDate : endsAt,
    });
  }
  const lastMonth = months.at(-1);
  // Past the end date of a cancelled subscription, not yet synchronized.
  if (!lastMonth || lastMonth.endsAt <= now) {
    return null;
  }

  return {
    interval: "year" as const,
    subscription,
    includedScreenshots,
    months,
    closedCount: firstIndex - currentIndex,
    termStartsAt: monthStart(firstIndex),
    termEndsAt: lastMonth.endsAt,
    reportedMonth,
    previousMonth,
  };
}

type ReportTerm = NonNullable<Awaited<ReturnType<typeof getReportTerm>>>;

function projectMonthUsage(closed: ScreenshotTotals[]): ScreenshotTotals {
  const window = closed
    .slice(-PROJECTION_WINDOW)
    .reverse()
    .map((totals, index) => ({ totals, weight: PROJECTION_WINDOW - index }));
  const totalWeight = sumBy(window, "weight");
  const weightedAverage = (pick: (totals: ScreenshotTotals) => number) =>
    Math.round(
      sumBy(window, (month) => pick(month.totals) * month.weight) / totalWeight,
    );
  return {
    all: weightedAverage((totals) => totals.all),
    storybook: weightedAverage((totals) => totals.storybook),
  };
}

/**
 * Where the plan stands, and on a yearly plan where the term is heading. Only
 * closed months are read: the report goes out right after a monthly
 * anniversary, when the running month holds a few hours of usage that would
 * only drag the average down.
 */
async function getTermUsage(term: ReportTerm) {
  const { subscription } = term;
  const closedMonths = term.months.slice(0, term.closedCount);
  const totals = (
    await getScreenshotTotals(
      closedMonths.map((month, index) => ({
        accountId: subscription.accountId,
        index,
        from: month.startsAt,
        to: month.endsAt,
      })),
    )
  ).get(subscription.accountId);
  invariant(totals, "every requested account comes back with totals");

  const closed = closedMonths.map((_month, index) => {
    const monthTotals = totals.get(index);
    invariant(monthTotals, "every requested month comes back with totals");
    return monthTotals;
  });
  const projected = projectMonthUsage(closed);
  const usage = term.months.map((month, index) => ({
    startsAt: month.startsAt,
    totals: closed[index] ?? projected,
    projected: index >= closed.length,
  }));
  const { includedScreenshots } = term;
  const overageCost = (months: ScreenshotTotals[]) =>
    getAdditionalScreenshotCost({
      subscription,
      totals: {
        all: sumBy(months, "all"),
        storybook: sumBy(months, "storybook"),
      },
      included: includedScreenshots,
    });

  return {
    months: usage.map((month) => ({
      startsAt: month.startsAt.toISOString(),
      screenshots: month.totals.all,
      projected: month.projected,
    })),
    includedScreenshots,
    // A monthly plan's quota resets every month: the overage is the one of the
    // month the report covers, billed with its invoice.
    currentOverageCost: overageCost(
      term.interval === "month" ? closed.slice(-1) : closed,
    ),
    // Fewer closed months than the projection weighs make a guess too rough
    // to put a price on: a first month busy with the setup would read as an
    // overage.
    projectedOverageCost:
      term.interval === "year" && closed.length >= PROJECTION_WINDOW
        ? overageCost(usage.map((month) => month.totals))
        : null,
  };
}

/** The data the email of a report renders. */
async function getMonthlyReportData(
  account: Account,
  term: ReportTerm,
  now: Date,
) {
  const { currency } = term.subscription;
  invariant(currency, "a usage-based Stripe subscription has a currency");
  // First: when the changelog cannot be read, the report waits, and the
  // queries below would be wasted.
  const news = await getChangelogNews({
    since: account.lastMonthlyReportAt
      ? new Date(account.lastMonthlyReportAt)
      : null,
    now,
  });
  const usage = await getTermUsage(term);
  const activity = await getMonthlyReportActivity(account, {
    current: term.reportedMonth,
    previous: term.previousMonth,
  });
  return {
    accountName: account.name,
    accountSlug: account.slug,
    currency,
    interval: term.interval,
    termStartsAt: term.termStartsAt.toISOString(),
    termEndsAt: term.termEndsAt.toISOString(),
    renews: term.subscription.endDate === null,
    blockingSpendLimit: account.blockWhenSpendLimitIsReached
      ? account.meteredSpendLimitByPeriod
      : null,
    ...usage,
    activity,
    news,
  };
}

/**
 * Send the monthly report of a team to its owners who have not turned it off,
 * if one is due: a month of its term closed since the last report.
 *
 * The report is marked sent once every email went out, so a failure is
 * retried. A retry sends to every owner again, and the idempotency key keeps
 * the ones who already got it from getting it twice.
 */
export async function sendAccountMonthlyReport(accountId: string, now: Date) {
  const account = await Account.query().findById(accountId);
  // Deleted between the enqueueing and this run.
  if (!account) {
    return;
  }
  invariant(account.teamId, "monthly reports are only enqueued for teams");

  const term = await getReportTerm(account, now);
  if (
    !term ||
    (account.lastMonthlyReportAt !== null &&
      new Date(account.lastMonthlyReportAt) >= term.reportedMonth.to)
  ) {
    return;
  }

  const owners = await Team.relatedQuery("owners")
    .for(account.teamId)
    .whereNull("team_users.monthlyReportOptedOutAt")
    .whereNotNull("users.email");
  if (owners.length === 0) {
    return;
  }

  const data = await getMonthlyReportData(account, term, now);
  // One email per owner, so no address is shown to the others.
  await Promise.all(
    owners.map((owner) => {
      invariant(owner.email, "owners are filtered on their email");
      return sendEmailTemplate({
        template: "monthly_report",
        data,
        to: [owner.email],
        idempotencyKey: `monthly-report/${account.id}/${term.reportedMonth.to.toISOString()}/${owner.id}`,
      });
    }),
  );

  await Account.query()
    .findById(account.id)
    .patch({ lastMonthlyReportAt: now.toISOString() });
}

/**
 * Turn the monthly report of a team on or off for a member. Each owner chooses
 * for themself. Null when the user is not a member of the team.
 */
export async function setMonthlyReportSubscription(input: {
  account: Account;
  userId: string;
  subscribed: boolean;
}): Promise<TeamUser | null> {
  const { teamId } = input.account;
  if (!teamId) {
    return null;
  }
  const [teamUser] = await TeamUser.query()
    .patch({
      monthlyReportOptedOutAt: input.subscribed
        ? null
        : new Date().toISOString(),
    })
    .where({ teamId, userId: input.userId })
    .returning("*");
  return teamUser ?? null;
}

export const monthlyReportJob = createJob<string>(
  "monthlyReport",
  {
    perform: async (accountId) => {
      await sendAccountMonthlyReport(accountId, new Date());
    },
  },
  // The activity of a large team reads a month of builds and test stats.
  { timeout: 300_000 },
);

/**
 * A page of the teams on a usage-based Stripe plan, the ones the
 * monthly report is for, in id order after `after`. Only teams: the choice to
 * receive it is kept on each owner's membership.
 */
async function getMonthlyReportAccountIds(
  after: string | null,
): Promise<string[]> {
  const query = Account.query()
    .select("accounts.id")
    .whereNotNull("accounts.teamId")
    .whereNull("accounts.forcedPlanId")
    .whereExists(
      Subscription.query()
        .joinRelated("plan")
        .whereColumn("subscriptions.accountId", "accounts.id")
        .where("subscriptions.provider", "stripe")
        .whereIn("subscriptions.status", ["active", "past_due"])
        .whereRaw("?? < now()", "subscriptions.startDate")
        .where((query) =>
          query
            .whereNull("subscriptions.endDate")
            .orWhereRaw("?? >= now()", "subscriptions.endDate"),
        )
        .where("plan.usageBased", true),
    )
    .orderBy("accounts.id")
    .limit(ACCOUNT_BATCH_SIZE);
  if (after !== null) {
    query.where("accounts.id", ">", after);
  }
  const accounts = await query;
  return accounts.map((account) => account.id);
}

/**
 * Enqueue the monthly report of every usage-based account, a page at a time. Each
 * account is its own job, so a large or failing one does not hold the others
 * back, and the work spreads across workers.
 */
export async function enqueueMonthlyReports() {
  let after: string | null = null;
  for (;;) {
    const accountIds = await getMonthlyReportAccountIds(after);
    const last = accountIds.at(-1);
    if (last === undefined) {
      return;
    }
    await monthlyReportJob.push(...accountIds);
    if (accountIds.length < ACCOUNT_BATCH_SIZE) {
      return;
    }
    after = last;
  }
}
