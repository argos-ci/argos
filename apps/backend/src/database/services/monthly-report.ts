import { invariant } from "@argos/util/invariant";
import { raw } from "objection";

import { getChangelogNews } from "@/changelog/news";
import { sendEmailTemplate } from "@/email/send-email-template";
import { createJob } from "@/job-core";

import { Account, Subscription, Team, TeamUser } from "../models";
import { getMonthlyReportActivity } from "./monthly-report-activity";
import {
  getMonthlyReportUnsubscribeUrl,
  verifyMonthlyReportUnsubscribeToken,
} from "./monthly-report-unsubscribe";
import {
  getAdditionalScreenshotCost,
  getIncludedScreenshots,
  getScreenshotTotals,
  PERIOD_BOUNDARY_TOLERANCE,
  type ScreenshotTotals,
} from "./period-usage";

/**
 * Closed months the months to come are projected from, weighted 3, 2 and 1
 * from the most recent back, so a change of pace shows in the next report
 * instead of being diluted over the whole window.
 */
const PROJECTION_WINDOW = 3;

/** Accounts read per page when enqueueing the reports. */
const ACCOUNT_BATCH_SIZE = 100;

/**
 * The report of a team on an annual usage-based plan, as of `now`: the months
 * of its term, the one that closed last and the one before it. Null when it
 * has none: not on such a plan, or in the first month of its term.
 *
 * A term is twelve monthly anniversaries rather than the yearly one, which
 * drifts by a day across a February 29.
 */
async function getReportTerm(account: Account, now: Date) {
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();
  // The subscription Argos meters on can differ from the one that matched the
  // annual plan query: an account holding several picks the largest plan.
  if (
    !subscription?.plan ||
    subscription.status === "trialing" ||
    subscription.plan.interval !== "year" ||
    !subscription.plan.usageBased ||
    // Without a quota, there is no plan to measure the usage against.
    getIncludedScreenshots(subscription, subscription.plan) === 0
  ) {
    return null;
  }

  const termStartsAt = subscription.getLastResetDate(now, "year");
  // Indexes count months back from the one holding `now`.
  const monthStart = (index: number) =>
    subscription.getResetDateAt(now, "month", index);
  const currentIndex = subscription.getCurrentPeriodIndex(now, "month");
  let firstIndex = currentIndex;
  // The monthly and yearly anniversaries come off the same start date through
  // different interval offsets, so they can land a moment apart.
  while (
    monthStart(firstIndex + 1).getTime() >=
    termStartsAt.getTime() - PERIOD_BOUNDARY_TOLERANCE
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
    subscription,
    plan: subscription.plan,
    months,
    closedCount: firstIndex - currentIndex,
    termStartsAt: monthStart(firstIndex),
    termEndsAt: lastMonth.endsAt,
    /** The report of a month is due once the next one opens. */
    dueSince: monthStart(currentIndex),
    reportedMonth: {
      from: monthStart(currentIndex + 1),
      to: monthStart(currentIndex),
    },
    previousMonth: {
      from: monthStart(currentIndex + 2),
      to: monthStart(currentIndex + 1),
    },
  };
}

type ReportTerm = NonNullable<Awaited<ReturnType<typeof getReportTerm>>>;

function projectMonthUsage(closed: ScreenshotTotals[]): ScreenshotTotals {
  const window = closed
    .slice(-PROJECTION_WINDOW)
    .reverse()
    .map((totals, index) => ({ totals, weight: PROJECTION_WINDOW - index }));
  const totalWeight = window.reduce((sum, month) => sum + month.weight, 0);
  const weightedAverage = (pick: (totals: ScreenshotTotals) => number) =>
    Math.round(
      window.reduce(
        (sum, month) => sum + pick(month.totals) * month.weight,
        0,
      ) / totalWeight,
    );
  return {
    all: weightedAverage((totals) => totals.all),
    storybook: weightedAverage((totals) => totals.storybook),
  };
}

/**
 * Where the term stands and where it is heading. Only closed months are read:
 * the report goes out right after a monthly anniversary, when the running
 * month holds a few hours of usage that would only drag the average down.
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
        endsAt: month.endsAt,
      })),
    )
  ).get(subscription.accountId);
  invariant(totals, "every requested account comes back with totals");

  const closed = closedMonths.map(
    (_month, index) => totals.get(index) ?? { all: 0, storybook: 0 },
  );
  const projected = projectMonthUsage(closed);
  const usage = term.months.map((month, index) => ({
    startsAt: month.startsAt,
    totals: closed[index] ?? projected,
    projected: index >= closed.length,
  }));
  const termTotals = usage.reduce(
    (sum, month) => ({
      all: sum.all + month.totals.all,
      storybook: sum.storybook + month.totals.storybook,
    }),
    { all: 0, storybook: 0 },
  );
  const includedScreenshots = getIncludedScreenshots(subscription, term.plan);

  return {
    months: usage.map((month) => ({
      startsAt: month.startsAt.toISOString(),
      screenshots: month.totals.all,
      projected: month.projected,
    })),
    includedScreenshots,
    projectedOverageCost: getAdditionalScreenshotCost({
      subscription,
      totals: termTotals,
      included: includedScreenshots,
    }),
  };
}

/** The data the email of a report renders, but its unsubscribe link. */
async function getMonthlyReportData(
  account: Account,
  term: ReportTerm,
  now: Date,
) {
  const { currency } = term.subscription;
  invariant(currency, "a usage-based Stripe subscription has a currency");
  const usage = await getTermUsage(term);
  const activity = await getMonthlyReportActivity(account, {
    current: term.reportedMonth,
    previous: term.previousMonth,
  });
  const news = await getChangelogNews({
    since: account.lastMonthlyReportAt
      ? new Date(account.lastMonthlyReportAt)
      : null,
    now,
  });
  return {
    accountName: account.name,
    accountSlug: account.slug,
    currency,
    termStartsAt: term.termStartsAt.toISOString(),
    termEndsAt: term.termEndsAt.toISOString(),
    renews: term.subscription.endDate === null,
    // Past it, new builds are refused rather than billed.
    blockingSpendLimit: account.blockWhenSpendLimitIsReached
      ? account.meteredSpendLimitByPeriod
      : null,
    ...usage,
    activity,
    news,
  };
}

/**
 * The monthly report of a team as of `now`, null when it has none. Read-only:
 * this is what the email preview renders.
 */
export async function getAccountMonthlyReport(account: Account, now: Date) {
  const term = await getReportTerm(account, now);
  return term ? getMonthlyReportData(account, term, now) : null;
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
      new Date(account.lastMonthlyReportAt) >= term.dueSince)
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
  await Promise.all(
    owners.map((owner) => {
      invariant(owner.email, "owners are filtered on their email");
      // Signed as of the report, so a retry sends the same email.
      const unsubscribeUrl = getMonthlyReportUnsubscribeUrl(
        { userId: owner.id, teamAccountId: account.id },
        term.dueSince,
      );
      return sendEmailTemplate({
        template: "monthly_report",
        data: { ...data, unsubscribeUrl },
        to: [owner.email],
        // The unsubscribe button of mail clients, one click (RFC 8058).
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        idempotencyKey: `monthly-report/${account.id}/${term.dueSince.toISOString()}/${owner.id}`,
      });
    }),
  );

  await Account.query()
    .findById(account.id)
    .patch({ lastMonthlyReportAt: now.toISOString() });
}

/**
 * Turn the monthly report of a team on or off for a member. Each owner chooses
 * for themself, and the date it was first turned off is kept. Null when the
 * user is not a member of the team.
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
        : raw("coalesce(??, now())", "monthlyReportOptedOutAt"),
    })
    .where({ teamId, userId: input.userId })
    .returning("*");
  return teamUser ?? null;
}

/**
 * Turn the monthly report off for the owner and the team an unsubscribe link
 * names. Returns the team, null when the token is invalid or expired, or the
 * user is no longer a member of it.
 */
export async function unsubscribeFromMonthlyReport(
  token: string,
): Promise<Account | null> {
  const payload = verifyMonthlyReportUnsubscribeToken(token);
  if (!payload) {
    return null;
  }
  const account = await Account.query().findById(payload.teamAccountId);
  if (!account) {
    return null;
  }
  const teamUser = await setMonthlyReportSubscription({
    account,
    userId: payload.userId,
    subscribed: false,
  });
  return teamUser ? account : null;
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
 * A page of the teams on an annual usage-based Stripe plan, the ones the
 * monthly report is for, in id order after `after`. Only teams: the choice to
 * receive it is kept on each owner's membership.
 */
async function getMonthlyReportAccountIds(input: {
  after: string | null;
  limit: number;
}): Promise<string[]> {
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
        .where("plan.interval", "year")
        .where("plan.usageBased", true),
    )
    .orderBy("accounts.id")
    .limit(input.limit);
  if (input.after !== null) {
    query.where("accounts.id", ">", input.after);
  }
  const accounts = await query;
  return accounts.map((account) => account.id);
}

/**
 * Enqueue the monthly report of every annual account, a page at a time. Each
 * account is its own job, so a large or failing one does not hold the others
 * back, and the work spreads across workers.
 */
export async function enqueueMonthlyReports() {
  let after: string | null = null;
  for (;;) {
    const accountIds = await getMonthlyReportAccountIds({
      after,
      limit: ACCOUNT_BATCH_SIZE,
    });
    if (accountIds.length > 0) {
      await monthlyReportJob.push(...accountIds);
    }
    const last = accountIds.at(-1);
    if (accountIds.length < ACCOUNT_BATCH_SIZE || last === undefined) {
      return;
    }
    after = last;
  }
}
