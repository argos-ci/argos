import { invariant } from "@argos/util/invariant";

import { getChangelogNews } from "@/changelog/news";
import { sendEmailTemplate } from "@/email/send-email-template";
import { createJob } from "@/job-core";

import { Account, Subscription, TeamUser, User } from "../models";
import { computeAdditionalScreenshots } from "./additional-screenshots";
import { getMonthlyReportActivity } from "./monthly-report-activity";
import {
  getMonthlyReportUnsubscribeUrl,
  verifyMonthlyReportUnsubscribeToken,
} from "./monthly-report-unsubscribe";
import { getScreenshotTotals, type ScreenshotTotals } from "./period-usage";

/**
 * Closed months the months to come are projected from, weighted 3, 2 and 1
 * from the most recent back, so a change of pace shows in the next report
 * instead of being diluted over the whole window.
 */
const PROJECTION_WINDOW = 3;

/** Accounts read per page when enqueueing the reports. */
const ACCOUNT_BATCH_SIZE = 100;

/**
 * Slack allowed when matching a monthly anniversary against the yearly one.
 * Both are derived from the same start date, but through different interval
 * offsets, so they can land a moment apart.
 */
const BOUNDARY_TOLERANCE = 60 * 60 * 1000;

type UsageReportMonth = {
  startsAt: Date;
  endsAt: Date;
  screenshots: ScreenshotTotals;
  /** Whether the month has not closed yet, and its usage is an estimate. */
  projected: boolean;
};

type AnnualUsageReport = {
  termStartsAt: Date;
  termEndsAt: Date;
  /** Every month of the term, the ones to come included. */
  months: UsageReportMonth[];
  includedScreenshots: number;
  currency: NonNullable<Subscription["currency"]>;
  /** Overage the term would be billed at renewal, at the current pace. */
  projectedOverageCost: number;
};

/**
 * Monthly windows of the yearly term holding `now`, on the subscription's own
 * monthly anniversary.
 */
function getTermMonths(subscription: Subscription, now: Date) {
  const [termStartsAt] = subscription.getPeriodStarts(now, "year", 1);
  invariant(termStartsAt, "a period always has a start");
  const termEndsAt = subscription.getPeriodEnd(now, "year");

  const currentIndex = subscription.getCurrentPeriodIndex(now, "month");
  const starts: Date[] = [];
  for (let index = currentIndex; ; index++) {
    const start = subscription.getResetDateAt(now, "month", index);
    if (start.getTime() < termStartsAt.getTime() - BOUNDARY_TOLERANCE) {
      break;
    }
    starts.unshift(start);
  }
  for (let index = currentIndex - 1; ; index--) {
    const start = subscription.getResetDateAt(now, "month", index);
    if (start.getTime() >= termEndsAt.getTime() - BOUNDARY_TOLERANCE) {
      break;
    }
    starts.push(start);
  }

  return {
    termStartsAt,
    termEndsAt,
    months: starts.map((startsAt, index) => ({
      startsAt,
      endsAt: starts[index + 1] ?? termEndsAt,
    })),
  };
}

function projectMonthUsage(
  closedMonths: { screenshots: ScreenshotTotals }[],
): ScreenshotTotals {
  const window = closedMonths
    .slice(-PROJECTION_WINDOW)
    .reverse()
    .map((month, index) => ({
      screenshots: month.screenshots,
      weight: PROJECTION_WINDOW - index,
    }));
  const totalWeight = window.reduce((sum, month) => sum + month.weight, 0);
  const weightedAverage = (pick: (totals: ScreenshotTotals) => number) =>
    Math.round(
      window.reduce(
        (sum, month) => sum + pick(month.screenshots) * month.weight,
        0,
      ) / totalWeight,
    );
  return {
    all: weightedAverage((totals) => totals.all),
    storybook: weightedAverage((totals) => totals.storybook),
  };
}

/**
 * Where an annual usage-based term stands and where it is heading.
 *
 * Only closed months are read: the report goes out right after a monthly
 * anniversary, when the running month holds a few hours of usage that would
 * only drag the average down. Null before the first month of the term closes.
 */
async function getAnnualUsageReport(
  subscription: Subscription,
  now: Date,
): Promise<AnnualUsageReport | null> {
  const { plan } = subscription;
  invariant(plan, "plan should be fetched with the subscription");
  invariant(
    plan.interval === "year" && plan.usageBased,
    "only annual usage-based plans have a usage report",
  );

  const term = getTermMonths(subscription, now);
  const closed = term.months.filter(
    (month) => month.endsAt.getTime() <= now.getTime(),
  );
  if (closed.length === 0) {
    return null;
  }

  const totals = (
    await getScreenshotTotals(
      closed.map((month, index) => ({
        accountId: subscription.accountId,
        index,
        from: month.startsAt,
        to: month.endsAt,
        endsAt: month.endsAt,
      })),
    )
  ).get(subscription.accountId);
  invariant(totals, "every requested account comes back with totals");

  const closedMonths = closed.map((month, index) => ({
    ...month,
    screenshots: totals.get(index) ?? { all: 0, storybook: 0 },
    projected: false,
  }));

  const projectedUsage = projectMonthUsage(closedMonths);
  const months = [
    ...closedMonths,
    ...term.months.slice(closed.length).map((month) => ({
      ...month,
      screenshots: projectedUsage,
      projected: true,
    })),
  ];

  const includedScreenshots =
    subscription.includedScreenshots ?? plan.includedScreenshots;

  // Storybook screenshots fall back to the neutral price when they have none
  // of their own, exactly as the per-account cost does.
  const price = {
    neutral: subscription.additionalScreenshotPrice ?? 0,
    storybook:
      subscription.additionalStorybookScreenshotPrice ??
      subscription.additionalScreenshotPrice ??
      0,
  };
  const all = months.reduce((sum, month) => sum + month.screenshots.all, 0);
  const storybook = months.reduce(
    (sum, month) => sum + month.screenshots.storybook,
    0,
  );
  const additional = computeAdditionalScreenshots({
    neutral: all - storybook,
    storybook,
    included: includedScreenshots,
  });

  invariant(
    subscription.currency,
    "a usage-based Stripe subscription has a currency",
  );

  return {
    termStartsAt: term.termStartsAt,
    termEndsAt: term.termEndsAt,
    months,
    includedScreenshots,
    currency: subscription.currency,
    projectedOverageCost:
      additional.neutral * price.neutral +
      additional.storybook * price.storybook,
  };
}

/**
 * Claim the usage report of the month that just closed. Claiming records the
 * moment on the account, so the report goes out once per monthly anniversary
 * however many runs see it due.
 */
async function claimUsageReport(
  account: Account,
  report: AnnualUsageReport,
  now: Date,
): Promise<boolean> {
  const runningMonth = report.months.find((month) => month.projected);
  // On the last month of the term, every month has closed: the report is due
  // since the last of them did.
  const dueSince = runningMonth
    ? runningMonth.startsAt
    : report.months.at(-1)?.endsAt;
  invariant(dueSince, "a report has at least one month");

  const claimed = await Account.query()
    .patch({ lastUsageReportAt: now.toISOString() })
    .where("id", account.id)
    .where((query) =>
      query
        .whereNull("lastUsageReportAt")
        .orWhere("lastUsageReportAt", "<", dueSince.toISOString()),
    )
    .returning("id");

  return claimed.length > 0;
}

/**
 * A page of the teams on an annual usage-based Stripe plan, the ones the
 * monthly report is for, in id order after `after`. Only teams: the choice to
 * receive it is kept on each owner's membership.
 */
async function getAnnualUsageReportAccountIds(input: {
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
 * The usage report of an account, and the data its email renders.
 * Null when it has none: not on an annual usage-based plan, or still in the
 * first month of its term.
 */
export async function getAccountUsageReport(account: Account, now: Date) {
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();
  // The subscription Argos meters on can differ from the one that matched the
  // annual plan query: an account holding several picks the largest plan.
  if (
    !subscription?.plan ||
    subscription.status === "trialing" ||
    subscription.plan.interval !== "year" ||
    !subscription.plan.usageBased
  ) {
    return null;
  }

  const report = await getAnnualUsageReport(subscription, now);
  if (!report) {
    return null;
  }

  const months = report.months.map((month) => ({
    startsAt: month.startsAt.toISOString(),
    screenshots: month.screenshots.all,
    projected: month.projected,
  }));
  const termEndsAt = report.termEndsAt.toISOString();
  const [activity, news] = await Promise.all([
    getMonthlyReportActivity(account, months, termEndsAt),
    getChangelogNews({
      since: account.lastUsageReportAt
        ? new Date(account.lastUsageReportAt)
        : null,
      now,
    }),
  ]);
  invariant(activity, "a report always has a closed month");

  return {
    report,
    data: {
      accountName: account.name,
      accountSlug: account.slug,
      currency: report.currency,
      includedScreenshots: report.includedScreenshots,
      projectedOverageCost: report.projectedOverageCost,
      termStartsAt: report.termStartsAt.toISOString(),
      termEndsAt,
      months,
      activity,
      news,
    },
  };
}

/**
 * Send the usage report of a team to its owners who have not turned it off,
 * if one is due: the team is on an annual plan and a month of its term closed
 * since the last report.
 */
export async function sendAccountUsageReport(accountId: string, now: Date) {
  const account = await Account.query().findById(accountId);
  // Deleted between the enqueueing and this run.
  if (!account) {
    return;
  }
  invariant(account.teamId, "usage reports are only enqueued for teams");

  const usageReport = await getAccountUsageReport(account, now);
  if (!usageReport) {
    return;
  }

  const owners = await User.query()
    .whereIn(
      "id",
      TeamUser.query()
        .select("userId")
        .where({ teamId: account.teamId, userLevel: "owner" })
        .whereNull("monthlyReportOptedOutAt"),
    )
    .whereNotNull("email");
  if (owners.length === 0) {
    return;
  }

  if (!(await claimUsageReport(account, usageReport.report, now))) {
    return;
  }

  // One email per owner, so each is greeted by name and no address is shown
  // to the others.
  await Promise.all(
    owners.map((owner) => {
      invariant(owner.email, "owners are filtered on their email");
      return sendEmailTemplate({
        template: "usage_report",
        data: {
          ...usageReport.data,
          unsubscribeUrl: getMonthlyReportUnsubscribeUrl({
            userId: owner.id,
            teamAccountId: account.id,
          }),
        },
        to: [owner.email],
      });
    }),
  );
}

/**
 * Turn the monthly report of a team on or off for a member, from the team
 * settings. Each owner chooses for themself. Null when the user is not a
 * member of the team.
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

/**
 * Turn the monthly report off for the owner and the team an unsubscribe link
 * names, keeping the date it was first turned off when the link is opened
 * again. Returns the team, null when the token is invalid or expired, or the
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
  invariant(account.teamId, "unsubscribe links are only signed for teams");
  const teamUser = await TeamUser.query().findOne({
    teamId: account.teamId,
    userId: payload.userId,
  });
  if (!teamUser) {
    return null;
  }
  await TeamUser.query()
    .findById(teamUser.id)
    .whereNull("monthlyReportOptedOutAt")
    .patch({ monthlyReportOptedOutAt: new Date().toISOString() });
  return account;
}

export const usageReportJob = createJob<string>(
  "usageReport",
  {
    perform: async (accountId) => {
      await sendAccountUsageReport(accountId, new Date());
    },
  },
  // The activity of a large team reads a month of builds and test stats.
  { timeout: 300_000 },
);

/**
 * Enqueue the usage report of every annual account, a page at a time. Each
 * account is its own job, so a large or failing one does not hold the others
 * back, and the work spreads across workers.
 */
export async function enqueueUsageReports() {
  let after: string | null = null;
  for (;;) {
    const accountIds = await getAnnualUsageReportAccountIds({
      after,
      limit: ACCOUNT_BATCH_SIZE,
    });
    if (accountIds.length > 0) {
      await usageReportJob.push(...accountIds);
    }
    const last = accountIds.at(-1);
    if (accountIds.length < ACCOUNT_BATCH_SIZE || last === undefined) {
      return;
    }
    after = last;
  }
}
