import { invariant } from "@argos/util/invariant";

import { sendNotification } from "@/notification";

import { Account, Subscription } from "../models";
import { computeAdditionalScreenshots } from "./additional-screenshots";
import { getScreenshotTotals, type ScreenshotTotals } from "./period-usage";

/** Closed months the projection of the months to come is averaged over. */
const PROJECTION_WINDOW = 3;

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

  const window = closedMonths.slice(-PROJECTION_WINDOW);
  const average = {
    all: Math.round(
      window.reduce((sum, month) => sum + month.screenshots.all, 0) /
        window.length,
    ),
    storybook: Math.round(
      window.reduce((sum, month) => sum + month.screenshots.storybook, 0) /
        window.length,
    ),
  };

  const months = [
    ...closedMonths,
    ...term.months.slice(closed.length).map((month) => ({
      ...month,
      screenshots: average,
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
 * Accounts on an annual usage-based Stripe plan, the ones the monthly report
 * is for.
 */
async function getAnnualUsageReportAccounts(): Promise<Account[]> {
  return Account.query()
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
    );
}

/**
 * The usage report of an account, and the data its notification renders.
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

  return {
    report,
    data: {
      accountName: account.name,
      accountSlug: account.slug,
      currency: report.currency,
      includedScreenshots: report.includedScreenshots,
      projectedOverageCost: report.projectedOverageCost,
      termStartsAt: report.termStartsAt.toISOString(),
      termEndsAt: report.termEndsAt.toISOString(),
      months: report.months.map((month) => ({
        startsAt: month.startsAt.toISOString(),
        screenshots: month.screenshots.all,
        projected: month.projected,
      })),
    },
  };
}

/**
 * Send the monthly usage report to the owners of every annual account whose
 * month just closed.
 */
export async function sendUsageReports(now: Date) {
  const accounts = await getAnnualUsageReportAccounts();
  for (const account of accounts) {
    const usageReport = await getAccountUsageReport(account, now);
    if (!usageReport) {
      continue;
    }

    const ownerIds = await account.$getOwnerIds();
    if (ownerIds.length === 0) {
      continue;
    }

    if (!(await claimUsageReport(account, usageReport.report, now))) {
      continue;
    }

    await sendNotification({
      type: "usage_report",
      data: usageReport.data,
      recipients: ownerIds,
    });
  }
}
