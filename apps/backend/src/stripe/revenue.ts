import { invariant } from "@argos/util/invariant";

import { knex } from "@/database";
import {
  Account,
  StripeInvoice,
  StripeInvoiceSync,
  Subscription,
} from "@/database/models";
import { getAccountBillings } from "@/database/services/period-usage";
import { startOfUTCMonth } from "@/util/utc-month";

/** What the teams on one billing interval contributed to a month. */
type StaffRevenueSplit = {
  revenue: number;
  teamsCount: number;
  /**
   * The part of `revenue` invoiced in a currency other than euros, converted
   * at the page's fixed rate.
   *
   * Stripe states each invoice in the currency it was raised in; dollars are
   * brought into euros at `EUR_PER_USD`, which is fixed rather than the day's
   * rate — so this says how much of the figure rests on that conversion.
   */
  foreignRevenue: number;
};

/** One invoice behind a team's month line. */
type StaffRevenueMonthTeamInvoice = {
  /** Net of tax and credit notes, in the currency it was raised in. */
  amount: number;
  currency: string;
  /** When it was raised. */
  invoicedAt: Date;
};

/** An amount in the currency it is stated in. */
type StaffRevenuePrice = {
  amount: number;
  currency: string;
};

/** What one team was invoiced over a month, one line of the breakdown. */
type StaffRevenueMonthTeam = {
  /** The team's slug, which names its pages. */
  slug: string;
  /** The team's display name, when it has one. */
  name: string | null;
  /** The Stripe customer the invoices were raised on. */
  stripeCustomerId: string;
  /** What the invoices add up to, in `currency`. */
  amount: number;
  /** The currency the team is invoiced in — null when a month mixes several. */
  currency: string | null;
  /** In euros, like the split it sums into. */
  revenue: number;
  /**
   * Screenshots the team consumed over the month — and, on a line still to be
   * billed, over the period its estimate was computed on.
   *
   * Beside the bill rather than behind it: a cycle bills the period it just
   * closed, which straddles two calendar months, so this is what the team got
   * through in the month the line is filed under, not what that invoice was
   * raised on.
   */
  screenshotsCount: number;
  /**
   * What the plan itself costs over a period, before any usage — null when the
   * subscription carries no amount, or when the team is no longer billed.
   *
   * This and the two below describe the subscription **as it stands today**,
   * not as it stood in the month: they are read to decide what to offer a team
   * next, which is a question about the present. Every other figure on the line
   * is read off the invoice and cannot be rewritten by a plan change.
   */
  planPrice: StaffRevenuePrice | null;
  /** What a period includes before overage is billed, on that same plan. */
  includedScreenshots: number | null;
  /** That plan's name, which says whether its quota is worth printing. */
  planName: string | null;
  /** The invoices the line adds up, newest first. Empty on an estimate. */
  invoices: StaffRevenueMonthTeamInvoice[];
  /**
   * When the cycle is expected to raise the bill, on a line Stripe has not
   * billed yet — and null on every line read from a real invoice.
   *
   * Such a line is an estimate, so it stays out of the month's own figures:
   * they report what was invoiced, and a projection summed into them would be
   * indistinguishable from money that came in.
   */
  estimatedAt: Date | null;
};

/** What Argos billed over one calendar month. */
type StaffRevenueMonth = {
  /** The first instant of the month, in UTC — what names it on screen. */
  month: Date;
  /** The two splits below, added up. */
  revenue: number;
  /** What teams billed by the month were invoiced that month. */
  monthlyPlans: StaffRevenueSplit;
  /**
   * What the annual contracts contributed to the month: their invoices
   * amortized, day by day, over the stretch each one pays for.
   */
  yearlyPlans: StaffRevenueSplit;
  /**
   * What GitHub Marketplace brought in over the month — beside the two above
   * rather than inside them, since GitHub bills it and Argos never sees it.
   */
  githubPlans: StaffRevenueSplit;
};

/** Upper bound on the window one call will read. */
export const MAX_MONTHS = 24;

/** The currency every amount on this page is stated in. */
const REPORTING_CURRENCY = "eur";

/**
 * Euros per dollar.
 *
 * Fixed rather than fetched: the business is run in euros and this page steers
 * it, so the figures should move with the book, not with the market — and an
 * approximate total in the right currency beats an exact one in the wrong one.
 * ECB said 0.855 on 2026-08-21; update it when the market drifts too far.
 */
const EUR_PER_USD = 0.855;

/** A Marketplace subscription, and the stretch it was billed over. */
type MarketplaceSubscription = {
  accountId: string;
  priceCents: number;
  startDate: string;
  endDate: string | null;
  trialEndDate: string | null;
};

/**
 * Every team subscription GitHub bills, with the dates that say which months
 * it was billed over.
 *
 * Read by dates rather than by today's status: what a past month brought in
 * is what was subscribed *then*, and a subscription cancelled since still
 * earned the months it ran for. The same book the Stripe figures read —
 * teams, none of them granted a plan rather than billed.
 */
async function getMarketplaceSubscriptions(): Promise<
  MarketplaceSubscription[]
> {
  const rows = (await Subscription.query()
    .select(
      "subscriptions.accountId",
      "subscriptions.startDate",
      "subscriptions.endDate",
      "subscriptions.trialEndDate",
      "plan.githubMonthlyPriceCents",
    )
    .joinRelated("plan")
    .join("accounts", "accounts.id", "subscriptions.accountId")
    .whereNotNull("accounts.teamId")
    .whereNull("accounts.userId")
    .whereNull("accounts.forcedPlanId")
    .where("subscriptions.provider", "github")
    .whereNotNull("plan.githubMonthlyPriceCents")) as unknown as {
    accountId: string | number;
    startDate: string;
    endDate: string | null;
    trialEndDate: string | null;
    githubMonthlyPriceCents: number;
  }[];

  return rows.map((row) => ({
    accountId: String(row.accountId),
    priceCents: row.githubMonthlyPriceCents,
    startDate: row.startDate,
    endDate: row.endDate,
    trialEndDate: row.trialEndDate,
  }));
}

/**
 * What GitHub Marketplace brought in over one month, in euros, gross of the
 * 5% GitHub keeps.
 *
 * The subscriptions running that month at their plans' list prices — GitHub
 * exposes no seller invoice API, only its listing and its subscribers, so
 * there are no invoices of its to mirror the way Stripe's are. Priced at
 * today's list, which is the one thing here that has no history: a plan's
 * price changing would restate the months before it, where the subscribers
 * that came and went are read from their own dates.
 */
function getMarketplaceMonthRevenue(
  subscriptions: MarketplaceSubscription[],
  month: { start: number; end: number },
  elapsed: { start: number; end: number },
): StaffRevenueSplit {
  const split = createSplit();
  const byAccount = new Map<string, number>();
  const monthMs = month.end - month.start;

  for (const subscription of subscriptions) {
    const started = new Date(subscription.startDate).getTime();
    const ended = subscription.endDate
      ? new Date(subscription.endDate).getTime()
      : Number.POSITIVE_INFINITY;
    // A trial bills nothing, so a month it was still running through earned
    // nothing either.
    const trialEnded = subscription.trialEndDate
      ? new Date(subscription.trialEndDate).getTime()
      : Number.NEGATIVE_INFINITY;
    if (
      started >= month.end ||
      ended <= month.start ||
      trialEnded > month.start
    ) {
      continue;
    }
    // A month bills its subscriptions once, so what one has earned is the
    // share of the month it was subscribed for — as much of it as has gone by,
    // and no more than the part it was there for. Read per subscription rather
    // than once for the batch: a projection carries the whole month, and a
    // team that cancelled on the third has not earned the rest of it.
    const covered =
      Math.min(ended, elapsed.end) - Math.max(started, elapsed.start);
    const share = monthMs > 0 ? Math.max(0, covered) / monthMs : 0;
    // One subscription per team, the richest, like every other figure here.
    byAccount.set(
      subscription.accountId,
      Math.max(
        byAccount.get(subscription.accountId) ?? 0,
        (subscription.priceCents / 100) * share,
      ),
    );
  }

  for (const amount of byAccount.values()) {
    addToSplit(split, { amount, currency: "usd" });
  }
  split.teamsCount = byAccount.size;
  return split;
}

/**
 * Why Stripe raised an invoice, for the ones that are a subscription being
 * billed.
 *
 * Not the whole story for the monthly figures: the odd legacy or partner deal
 * is billed by hand, month after month, and those invoices carry the sales-led
 * reasons below instead. The reader takes both; what stays out is `upcoming` —
 * a preview, not an invoice — and pending-item sweeps, which duplicate what
 * the cycle will bill.
 */
const SUBSCRIPTION_BILLING_REASONS = new Set<string>([
  "subscription",
  "subscription_create",
  "subscription_cycle",
  "subscription_threshold",
  "subscription_update",
]);

/**
 * A period covering at least this long reads as a year's bill.
 *
 * Under a full year on purpose: an annual invoice raised a few weeks into the
 * period it covers, or prorated at conversion, still has to read as the
 * contract — where a monthly cycle or a one-month true-up never comes close.
 */
const ANNUAL_PERIOD_MS = 300 * 24 * 3600 * 1000;

/**
 * Under this, a stated period is a bookkeeping stamp rather than coverage.
 *
 * Sales invoices routinely carry the day they were raised as their period, or
 * a couple of days around it; read as real, a year's contract would amortize
 * into a single week.
 */
const STAMP_PERIOD_MS = 7 * 24 * 3600 * 1000;

/**
 * Above this, a stated period is a term rather than a month.
 *
 * A hand-raised invoice covering about a month is a monthly bill — legacy and
 * partner deals are billed that way — where one covering longer is a stretch
 * sold as a block, and belongs to the months it pays for.
 */
const MONTHLY_PERIOD_MS = 45 * 24 * 3600 * 1000;

/**
 * How long a mirror may go unswept before its figures stop being trusted.
 *
 * The cron runs daily, so a week of silence means it is not running — and a
 * mirror nothing reconciles drifts from Stripe invisibly.
 */
const STALE_MIRROR_MS = 7 * 24 * 3600 * 1000;

/**
 * The reasons an invoice is raised by a person rather than by a billing cycle.
 *
 * Sales-led deals are billed this way — a dashboard invoice or an accepted
 * quote, often carried by no subscription at all — whether the deal is an
 * annual contract or a legacy team invoiced by hand every month. Their
 * periods are frequently missing or degenerate, so they cannot be recognized
 * by coverage the way cycle invoices can.
 */
const SALES_LED_BILLING_REASONS = new Set<string>(["manual", "quote_accept"]);

/** A team Argos bills through Stripe, and how it is billed. */
type BilledTeam = {
  accountId: string;
  slug: string;
  name: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  interval: "month" | "year";
  /** What Stripe bills it in, or null on a subscription never synced for it. */
  currency: string | null;
  /**
   * What the plan itself costs over a period, as Stripe holds it — null on a
   * subscription Argos has not read the amount off yet, or one priced by tiers.
   */
  flatPrice: number | null;
  /**
   * What a period includes before anything is billed as overage: the
   * subscription's own quota when Stripe states one, the plan's otherwise —
   * the same order the usage is metered against.
   */
  includedScreenshots: number;
  /**
   * What one screenshot past the quota costs, in `currency` — null on a
   * subscription Stripe states no unit price for.
   *
   * Only ever read to price a projection on a period that has not gone over
   * yet: past that, what the overage has already cost says more, since it
   * carries the Storybook mix the period was actually billed at.
   */
  additionalScreenshotPrice: number | null;
  /** The plan's name, which is what says whether its quota is worth printing. */
  planName: string;
};

/**
 * Every team on a paying Stripe subscription, and the interval it is billed on.
 *
 * Narrower than the subscription `getAccountBillings` resolves, deliberately: a
 * trial is dropped here where that one keeps it, because a trial is invoiced
 * nothing and this reads invoices. An account holding both a trial and a paid
 * subscription can therefore resolve a different plan on the two sides — the
 * paid one here, which is the one that produced the invoices.
 *
 * Granted plans are excluded for the same reason: they bill nothing, so no
 * invoice of theirs exists to find.
 */
export async function getBilledTeams(): Promise<BilledTeam[]> {
  const rows = (await Subscription.query()
    .select(
      "subscriptions.accountId",
      "subscriptions.stripeSubscriptionId",
      "subscriptions.currency",
      "accounts.slug",
      "accounts.name",
      "accounts.stripeCustomerId",
      "subscriptions.flatPrice",
      "subscriptions.includedScreenshots",
      "subscriptions.additionalScreenshotPrice",
      "plan.interval",
      "plan.name as planName",
      "plan.includedScreenshots as planIncludedScreenshots",
    )
    .joinRelated("plan")
    .join("accounts", "accounts.id", "subscriptions.accountId")
    .whereNotNull("accounts.teamId")
    .whereNull("accounts.userId")
    .whereNull("accounts.forcedPlanId")
    .whereNotNull("accounts.stripeCustomerId")
    // A subscription Argos bills through GitHub raises no Stripe invoice, so
    // there is nothing to look up for it.
    .whereNotNull("subscriptions.stripeSubscriptionId")
    .whereRaw("?? < now()", "subscriptions.startDate")
    // `past_due` is in: the invoice was raised, and whether it clears is a
    // collection question rather than a revenue one.
    .whereIn("subscriptions.status", ["active", "past_due"])
    .where((query) =>
      query
        .whereNull("subscriptions.endDate")
        .orWhereRaw("?? >= now()", "subscriptions.endDate"),
    )
    .distinctOn("subscriptions.accountId")
    .orderBy("subscriptions.accountId")
    .orderBy("plan.includedScreenshots", "DESC")) as unknown as {
    accountId: string | number;
    slug: string;
    name: string | null;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    interval: "month" | "year";
    currency: string | null;
    flatPrice: number | null;
    includedScreenshots: number | null;
    additionalScreenshotPrice: number | null;
    planName: string;
    planIncludedScreenshots: number;
  }[];

  return rows.map((row) => ({
    accountId: String(row.accountId),
    slug: row.slug,
    name: row.name,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    interval: row.interval,
    currency: row.currency,
    flatPrice: row.flatPrice,
    includedScreenshots: row.includedScreenshots ?? row.planIncludedScreenshots,
    additionalScreenshotPrice: row.additionalScreenshotPrice,
    planName: row.planName,
  }));
}

/** How a month's breakdown names a team, and what it reads its usage off. */
type TeamCustomer = {
  accountId: string;
  slug: string;
  name: string | null;
};

/**
 * Every Stripe customer that is an Argos team, whether or not it still pays,
 * with what to call it on screen.
 *
 * Read over all team accounts rather than over the billed ones: a team that has
 * since churned keeps the invoices it was already sent, and a month it was
 * invoiced in would otherwise lose it — which is exactly the revenue a
 * comparison between two months exists to show. Personal accounts are left out,
 * so what they may have been invoiced never reaches a page about teams.
 */
export async function getTeamCustomers(): Promise<Map<string, TeamCustomer>> {
  const rows = (await Account.query()
    .select("id", "stripeCustomerId", "slug", "name")
    .whereNotNull("teamId")
    .whereNull("userId")
    .whereNotNull("stripeCustomerId")) as unknown as {
    id: string | number;
    stripeCustomerId: string;
    slug: string;
    name: string | null;
  }[];

  return new Map(
    rows.map((row) => [
      row.stripeCustomerId,
      { accountId: String(row.id), slug: row.slug, name: row.name },
    ]),
  );
}

/** The key a calendar month is filed under in the usage read below. */
function getMonthKey(month: Date): string {
  return month.toISOString().slice(0, 7);
}

/**
 * Screenshots consumed per team and per calendar month over the window.
 *
 * Cut in UTC like the months themselves, and keyed by the year and month
 * Postgres prints rather than by a timestamp: a truncated date read back
 * through the process's own timezone would file a bucket in the month next
 * door for every server not running on UTC.
 */
async function getMonthlyScreenshots(window: {
  from: Date;
  to: Date;
  /** The accounts the page will read, which is all it has lines for. */
  accountIds: string[];
}): Promise<Map<string, Map<string, number>>> {
  if (window.accountIds.length === 0) {
    return new Map();
  }

  const from = window.from.toISOString();
  const to = window.to.toISOString();
  const result = new Map<string, Map<string, number>>();

  const add = (accountId: string, month: string, count: number) => {
    const months = result.get(accountId) ?? new Map<string, number>();
    months.set(month, (months.get(month) ?? 0) + count);
    result.set(accountId, months);
  };

  // Two passes, like the billing aggregate this has to agree with: screenshots
  // hang off buckets, the units a recording is billed as hang off media
  // versions, and the two reach an account by different joins.
  const bucketMonth = `to_char(sb."createdAt" at time zone 'UTC', 'YYYY-MM')`;
  const bucketRows = (await knex
    .select("p.accountId")
    .select(knex.raw(`${bucketMonth} as "month"`))
    // Null until a bucket completes, and summed as-is by the billing figures
    // this sits beside.
    .select(knex.raw(`coalesce(sum(sb."screenshotCount"), 0) as "count"`))
    .from("screenshot_buckets as sb")
    .join("projects as p", "p.id", "sb.projectId")
    .whereIn("p.accountId", window.accountIds)
    .where("sb.createdAt", ">=", from)
    .where("sb.createdAt", "<", to)
    .groupBy("p.accountId", knex.raw(bucketMonth))) as unknown as {
    accountId: string | number;
    month: string;
    count: string | number;
  }[];
  for (const row of bucketRows) {
    add(String(row.accountId), row.month, Number(row.count));
  }

  // Billed on the day the upload completed, not the day the media row was
  // created: replacing a recording uploads a new version long after.
  const mediaMonth = `to_char(mv."uploadedAt" at time zone 'UTC', 'YYYY-MM')`;
  const mediaRows = (await knex
    .select("p.accountId")
    .select(knex.raw(`${mediaMonth} as "month"`))
    .select(knex.raw(`coalesce(sum(mv."billedUnits"), 0) as "count"`))
    .from("media_versions as mv")
    .join("media as m", "m.id", "mv.mediaId")
    .join("projects as p", "p.id", "m.projectId")
    .whereIn("p.accountId", window.accountIds)
    .whereNotNull("mv.uploadedAt")
    .where("mv.uploadedAt", ">=", from)
    .where("mv.uploadedAt", "<", to)
    .groupBy("p.accountId", knex.raw(mediaMonth))) as unknown as {
    accountId: string | number;
    month: string;
    count: string | number;
  }[];
  for (const row of mediaRows) {
    add(String(row.accountId), row.month, Number(row.count));
  }

  return result;
}

/** What one invoice contributed, in the currency it was raised in. */
export type InvoiceRevenue = { amount: number; currency: string };

/**
 * What one mirrored invoice contributed to revenue, in the currency's main
 * unit.
 *
 * Excluding tax, because VAT collected on behalf of a state is not revenue, and
 * net of credit notes, because an invoice refunded after the fact keeps its
 * `amount_paid` intact — reading that field alone would count money that was
 * given back. Both sides of that subtraction are ex-tax: the credited amount
 * is resolved at ingest from the credit notes themselves, so a fully refunded
 * taxed invoice nets to zero rather than to minus its VAT.
 */
export function getInvoiceRevenue(invoice: {
  currency: string;
  total: number;
  totalExcludingTax: number | null;
  /** The listed taxes added up — the fallback when no pre-tax total exists. */
  totalTaxesAmount: number | null;
  creditedAmountExcludingTax: number;
}): InvoiceRevenue {
  // Null on invoices Stripe states no pre-tax total for. The taxes it listed
  // are taken off the total instead, rather than letting the tax through as
  // revenue — falling back to `total` alone would overstate every invoice that
  // collected VAT, and say nothing about it.
  const excludingTax =
    invoice.totalExcludingTax ??
    invoice.total - (invoice.totalTaxesAmount ?? 0);

  return {
    // Stripe states amounts in the currency's minor unit.
    amount: (excludingTax - invoice.creditedAmountExcludingTax) / 100,
    currency: invoice.currency,
  };
}

/**
 * An invoice's contribution in euros: dollars at the fixed rate, euros as they
 * are. Stripe raises them in one or the other and never anything else; a third
 * currency would land at parity and in the foreign share, where the caveat on
 * screen would at least point at it.
 */
export function toEuros(revenue: InvoiceRevenue): number {
  return revenue.currency === "usd"
    ? revenue.amount * EUR_PER_USD
    : revenue.amount;
}

function createSplit(): StaffRevenueSplit {
  return { revenue: 0, teamsCount: 0, foreignRevenue: 0 };
}

/** Add one invoice to a split, in euros, tracking what was converted. */
function addToSplit(split: StaffRevenueSplit, revenue: InvoiceRevenue): void {
  const amount = toEuros(revenue);
  split.revenue += amount;
  if (revenue.currency !== REPORTING_CURRENCY) {
    split.foreignRevenue += amount;
  }
}

/** One invoice a contract's worth is read from. */
type StaffContractInvoice = {
  /** Net of tax and credit notes, in the currency it was raised in. */
  amount: number;
  currency: string;
  /** When it was raised. */
  invoicedAt: Date;
  /** The stretch its money pays for, after the next bill clipped it. */
  coveredFrom: Date;
  coveredUntil: Date;
  /** True while it is raised but not yet cleared. */
  awaitingPayment: boolean;
};

/**
 * What a contract's running term has consumed, and where that lands by the
 * renewal if it carries on at the rate it has run so far.
 *
 * The term rather than the month: a yearly quota resets once a year, so what
 * says whether a contract is about to be re-priced is the whole year against
 * the whole quota — the question a renewal is negotiated on.
 */
type StaffContractUsage = {
  /** The term the figures below are read over, and the day it renews on. */
  periodFrom: Date;
  periodEndsAt: Date;
  /** Screenshots consumed since the term opened. */
  screenshotsCount: number;
  /** What the term includes before overage is billed. */
  includedScreenshots: number;
  /** What the overage run up so far comes to, in euros. */
  additionalCost: number;
  /**
   * That same overage in the currency Stripe prices it in — what the contract's
   * own column adds it to, where the euro figure above is what the page's
   * monthly rate is built from.
   */
  additionalPrice: StaffRevenuePrice;
  /**
   * That same overage averaged over the months of the term that have gone by,
   * in euros — what a month of the contract's usage has been worth, beside the
   * month of the contract itself that the table reports.
   *
   * A mean rather than the month's own: the quota is crossed once somewhere in
   * the year and every month after it bills, so a term two months in reads
   * high and one eleven months in reads low. It is the figure that says what
   * the usage adds to a month, not what this month happened to add.
   */
  monthlyAdditionalCost: number;
  /** Where the count lands by the renewal, at the rate the term has run at. */
  projectedScreenshotsCount: number;
  /** What that projected overage would come to, in euros. */
  projectedAdditionalCost: number;
};

/** One annual contract, and the invoices its figure is read from. */
type StaffYearlyContract = {
  /** The team's slug, which names its pages. */
  slug: string;
  /** The team's display name, when it has one. */
  name: string | null;
  /** The Stripe customer the contract is billed on. */
  stripeCustomerId: string;
  /**
   * The contract's invoices added up, in euros. Null when the team is billed
   * yearly but no invoice of its contract could be found — an anomaly worth
   * seeing rather than hiding.
   */
  amount: number | null;
  /** What the contract contributes to the running month, in euros. */
  monthlyRevenue: number;
  /** The invoices it is worth, newest first. */
  invoices: StaffContractInvoice[];
  /** True when any invoice found is still awaiting payment. */
  awaitingPayment: boolean;
  /**
   * What the team's running term has consumed, and where it lands — null when
   * no yearly subscription of the team's can be read for it: one no longer
   * billed, one on a plan nothing is metered against, or a contract invoiced by
   * hand with no subscription behind it.
   */
  usage: StaffContractUsage | null;
};

/** The statuses an invoice counts under: raised, and not written off. */
const COUNTED_STATUSES = ["paid", "open"];

/**
 * How far back the contract scan reaches beyond the reported window.
 *
 * A renewal raised a year before the window can still be paying for its first
 * months, so the invoices that cover a month are not only the ones raised in
 * it.
 */
const CONTRACT_SCAN_MS = 400 * 24 * 3600 * 1000;

/** The parts of a mirrored invoice the classification reads. */
export type ClassifiableInvoice = {
  billingReason: string | null;
  stripeCreatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
};

/**
 * The stretch an invoice states it covers, or null when it states none worth
 * reading.
 *
 * A period of a few days is a bookkeeping stamp rather than coverage — sales
 * invoices carry those routinely — and reading one as real would amortize a
 * year's contract into a single week.
 */
function getStatedPeriod(
  invoice: ClassifiableInvoice,
): { start: number; end: number } | null {
  if (invoice.periodStart === null || invoice.periodEnd === null) {
    return null;
  }
  const start = new Date(invoice.periodStart).getTime();
  const end = new Date(invoice.periodEnd).getTime();
  return end - start >= STAMP_PERIOD_MS ? { start, end } : null;
}

/** How an invoice was billed, which is what decides where it is reported. */
export type InvoiceKind =
  /** A contract, paying for a stretch: reported over the months it covers. */
  | { kind: "contract"; coverage: { start: number; end: number } }
  /** Everything else: reported in the month it was raised. */
  | { kind: "monthly" };

/**
 * How an invoice is reported, read from the invoice alone.
 *
 * Never from the customer's subscription today: an invoice is a fact of the
 * month it was raised in, and a team that converts, churns or is billed by
 * hand must not rewrite what it was already sent. What makes a contract is
 * either a stretch of about a year, whatever Stripe filed the invoice under,
 * or a sales-led invoice — those are how deals negotiated outside the
 * self-serve flow arrive, and their periods are often a stamp or absent.
 */
export function classifyInvoice(
  invoice: ClassifiableInvoice,
  options: {
    /**
     * Whether this customer has a bill covering a term elsewhere in the scan.
     *
     * What tells a renewal stated without any period — how sales-led annual
     * deals routinely arrive — from a one-off raised by hand: the first
     * belongs to a customer Argos bills in terms, the second does not.
     */
    customerHasTerm: boolean;
  },
): InvoiceKind {
  const issued = new Date(invoice.stripeCreatedAt).getTime();
  const period = getStatedPeriod(invoice);

  if (period && period.end - period.start >= ANNUAL_PERIOD_MS) {
    // Stamped in arrears — its period ends by the day it was raised — reads as
    // collecting for the year ahead rather than paying for one already over.
    return period.end > issued
      ? { kind: "contract", coverage: period }
      : { kind: "contract", coverage: yearFrom(issued) };
  }

  // Longer than a month, whatever raised it: an upgrade prorated to the end of
  // a term arrives as a `subscription_update` covering the months that remain,
  // and belongs to them rather than to the day it was raised.
  if (period && period.end - period.start > MONTHLY_PERIOD_MS) {
    return {
      kind: "contract",
      // Stamped in arrears — its period ends by the day it was raised — reads
      // as collecting for the stretch ahead rather than paying for one over.
      // The same stretch, not a year: a quarter billed late is a quarter, and
      // stretching it to a year would let it supersede the contract it sits
      // inside.
      coverage: period.end > issued ? period : shiftForward(period, issued),
    };
  }

  const isSalesLed =
    invoice.billingReason !== null &&
    SALES_LED_BILLING_REASONS.has(invoice.billingReason);
  if (isSalesLed && !period) {
    return options.customerHasTerm
      ? { kind: "contract", coverage: yearFrom(issued) }
      : { kind: "monthly" };
  }
  return { kind: "monthly" };
}

/**
 * The customers holding a bill that covers a term.
 *
 * What makes a period-less sales invoice read as a renewal of theirs rather
 * than as a one-off raised by hand.
 */
function getCustomersWithTerms(
  invoices: (ClassifiableInvoice & { stripeCustomerId: string })[],
): Set<string> {
  const customers = new Set<string>();
  for (const invoice of invoices) {
    const period = getStatedPeriod(invoice);
    if (period && period.end - period.start >= ANNUAL_PERIOD_MS) {
      customers.add(invoice.stripeCustomerId);
    }
  }
  return customers;
}

/** The same stretch, starting when the invoice was raised. */
function shiftForward(
  period: { start: number; end: number },
  issued: number,
): { start: number; end: number } {
  return { start: issued, end: issued + (period.end - period.start) };
}

/** A year from `issued`, for a contract invoice that states no usable one. */
function yearFrom(issued: number): { start: number; end: number } {
  const end = new Date(issued);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start: issued, end: end.getTime() };
}

/** A contract invoice, with what reading it resolved. */
type ContractRead = {
  row: StripeInvoice;
  revenue: InvoiceRevenue;
  coverage: { start: number; end: number };
  /**
   * The stretch the invoice was raised for, before the next bill clipped it.
   *
   * What the money is spread at: an invoice pays for its own term at its own
   * rate, so a term cut short delivers less rather than the same amount faster.
   */
  termMs: number;
  /** A full term supersedes the one before it; a shorter one adds to it. */
  isFullTerm: boolean;
};

/**
 * Clip each customer's full-term contracts at the next one's start.
 *
 * A renewal takes over from the term before it, and a contract re-billed
 * mid-term replaces what it re-bills — so their stretches must not overlap, or
 * the months they share would count both. Shorter contract invoices are
 * upsells sold on top of a term and are left alone: they are meant to add.
 */
function clipContractTerms(reads: ContractRead[]): ContractRead[] {
  const byCustomer = Map.groupBy(reads, (read) => read.row.stripeCustomerId);
  const clipped: ContractRead[] = [];

  for (const customerReads of byCustomer.values()) {
    const terms = customerReads
      .filter((read) => read.isFullTerm)
      .sort((a, b) => a.coverage.start - b.coverage.start);
    for (const [index, term] of terms.entries()) {
      const next = terms[index + 1];
      const end = next
        ? Math.min(term.coverage.end, next.coverage.start)
        : term.coverage.end;
      if (end > term.coverage.start) {
        clipped.push({
          ...term,
          coverage: { start: term.coverage.start, end },
        });
      }
    }
    clipped.push(...customerReads.filter((read) => !read.isFullTerm));
  }

  return clipped;
}

/**
 * What the running month is on course to come to, once everything it has not
 * billed yet is counted.
 *
 * The month itself reports what was invoiced, which is why it reads low all
 * month and only catches up on the last cycle of it. This is the other
 * question — what the month will be worth — and the three figures below are
 * the same three, each carried to the end of the month rather than stopped at
 * today.
 */
type StaffRevenueProjection = {
  /** The three below, added up. */
  revenue: number;
  /** Invoiced so far, plus the bills the cycles have not raised yet. */
  monthlyPlans: number;
  /** A whole month of the contracts, not the share of it that has gone by. */
  yearlyPlans: number;
  /** A whole month of Marketplace, on the same basis. */
  githubPlans: number;
  /**
   * The part of `monthlyPlans` no invoice exists for: what the subscriptions
   * still to be billed have run up so far, which is a floor rather than a
   * forecast — their usage keeps accruing until the cycle closes.
   */
  estimated: number;
};

/** What Argos invoiced, and the annual contracts behind the yearly figures. */
export type StaffRevenue = {
  /** Oldest first, the running month last. */
  months: StaffRevenueMonth[];
  /** The contracts behind the yearly figures, largest first. */
  yearlyContracts: StaffYearlyContract[];
  /** Where the running month is heading, beside what it has billed. */
  projection: StaffRevenueProjection;
};

/**
 * What the team is on today, for the columns that describe the plan rather
 * than the bill: its price, its quota, and the name that says whether the
 * quota is worth printing beside a count.
 *
 * Null throughout for a team no longer billed — a churned one keeps its
 * invoices, but there is no plan of its left to describe.
 */
function getPlanColumns(team: BilledTeam | undefined): {
  planPrice: StaffRevenuePrice | null;
  includedScreenshots: number | null;
  planName: string | null;
} {
  if (!team) {
    return { planPrice: null, includedScreenshots: null, planName: null };
  }
  // Stripe states every amount per billing period, and a yearly subscription's
  // period is a year. Every figure on this line is a month's, so the price is
  // brought back to one — the same reading the staff tables hold everywhere.
  const months = team.interval === "year" ? 12 : 1;
  return {
    planPrice:
      team.flatPrice === null
        ? null
        : {
            amount: team.flatPrice / months,
            currency: team.currency ?? REPORTING_CURRENCY,
          },
    // Not divided the way the price is, and not reported at all off a monthly
    // cycle: a quota resets once a period, so a year's has no share that a
    // month's usage could be read against. Stating a twelfth of it would
    // invent a limit the team is never metered on.
    includedScreenshots: months === 1 ? team.includedScreenshots : null,
    planName: team.planName,
  };
}

/**
 * The bills the running month is still waiting on, priced off the usage so far.
 *
 * A team whose cycle falls on the 30th has been invoiced nothing on the 12th,
 * and the month reads as if it had left. These are the lines that say
 * otherwise: one per team billed by the month that Stripe has not billed yet,
 * carrying what the subscription is on course to be invoiced — the plan's own
 * amount plus the overage the running period has accumulated, which is the
 * same reading the team directory prices that period at.
 *
 * They are estimates, so they are kept out of every figure the month reports.
 * What they are worth is what the cycle has not decided yet: usage still to
 * come, a credit note, a plan changed mid-month.
 */
async function getEstimatedBills(options: {
  billedTeams: BilledTeam[];
  /** The month the estimates are reported in, which bounds when they fall. */
  runningMonth: { start: number; end: number };
}): Promise<StaffRevenueMonthTeam[]> {
  const pending = options.billedTeams.filter(
    // Monthly cycles alone: a yearly contract is not owed a bill every month,
    // and it has a table of its own that says what it is worth.
    (team) => team.interval === "month",
  );

  if (pending.length === 0) {
    return [];
  }

  // Which cycles can still bill this month is a question the subscriptions
  // answer on their own, off an index. The usage aggregate below is the
  // heaviest read on the page, so it is asked only about the teams that can
  // produce a line at all — on the last days of a month, a handful of them.
  const subscriptions = await Subscription.query().whereIn(
    "stripeSubscriptionId",
    pending.map((team) => team.stripeSubscriptionId),
  );
  const subscriptionByAccountId = new Map(
    subscriptions.map((subscription) => [subscription.accountId, subscription]),
  );
  const now = new Date();
  const due = pending.filter((team) => {
    const subscription = subscriptionByAccountId.get(team.accountId);
    return (
      subscription !== undefined &&
      subscription.getPeriodEnd(now, "month").getTime() <
        options.runningMonth.end
    );
  });

  if (due.length === 0) {
    return [];
  }

  const accounts = await Account.query().findByIds(
    due.map((team) => team.accountId),
  );
  const billings = await getAccountBillings(accounts);
  const bills: StaffRevenueMonthTeam[] = [];

  for (const team of due) {
    const billing = billings.get(team.accountId);
    const period = billing?.periodUsage?.billingPeriods.find(
      (billingPeriod) => !billingPeriod.closed,
    );
    // A cycle that closes after this month bills in the next one, not in this
    // one — which is the whole test, and the only one worth making. It covers
    // the team whose cycle already came round, whether or not the mirror has
    // its invoice yet: the period has rolled over either way. Reading the
    // month's invoices instead would suppress the cycle bill of a team that
    // was sent a mid-month proration, whose own bill is still to come.
    if (period && period.endsAt.getTime() >= options.runningMonth.end) {
      continue;
    }
    // Two ways a subscription has nothing to estimate from, and neither is
    // worth a guess. No amount on file: the plan's own price is most of a
    // bill, so quoting the overage alone would report a team about to be
    // invoiced as owing next to nothing — and a figure of ours would read
    // exactly like the ones beside it, which are read off Stripe. No running
    // period: the plan is not metered by usage, so nothing here knows when its
    // cycle bills, and a flat bill left out of the month beats one dated by
    // guesswork.
    if (!billing || !period || billing.flatPrice === null) {
      continue;
    }

    // The amount and the period are read off the subscription the billing
    // resolved, the currency and the plan off the one the team read resolved,
    // and the two queries do not pick from the same shortlist — a trial counts
    // for one and not the other. Where they disagree on the interval they have
    // disagreed on the subscription, and the price would be a year's stamped
    // into a month.
    if (billing.plan?.interval !== "month") {
      continue;
    }

    const revenue = {
      amount: billing.flatPrice + period.additionalScreenshotCost,
      currency: team.currency ?? REPORTING_CURRENCY,
    };
    bills.push({
      slug: team.slug,
      name: team.name,
      stripeCustomerId: team.stripeCustomerId,
      amount: revenue.amount,
      currency: revenue.currency,
      revenue: toEuros(revenue),
      screenshotsCount: period.screenshotsCount,
      ...getPlanColumns(team),
      invoices: [],
      // The anniversary the period closes on, which is the day the cycle bills.
      estimatedAt: period.endsAt,
    });
  }

  return bills;
}

/**
 * A contract's usage as the table reports it, with what the month splits need
 * to spread the overage behind it.
 *
 * The raw amounts travel beside the euro ones the table reads: the splits
 * convert every figure themselves and count what the conversion touched, which
 * is what the foreign-share caveat on the cards is read off.
 */
type ContractUsageRead = {
  usage: StaffContractUsage;
  /** The overage run up so far, in the currency Stripe priced it in. */
  accrued: InvoiceRevenue;
  /** A whole month of it, on the same terms — what the projection carries. */
  monthlyAccrued: InvoiceRevenue;
  /** The stretch it accrued over, which is what it is spread across. */
  from: number;
  until: number;
};

/**
 * What each annual contract's running term has consumed, keyed by the customer
 * it is billed on.
 *
 * Read off `getAccountBillings`, the same pass the team directory prices a
 * period with, so the count a contract is quoted against here is the one the
 * team's own pages state. It costs a scan of two terms of usage per team,
 * which is why it is asked about the yearly teams alone — a dozen rows, where
 * the monthly book is hundreds.
 */
async function getContractUsages(
  billedTeams: BilledTeam[],
): Promise<Map<string, ContractUsageRead>> {
  const usages = new Map<string, ContractUsageRead>();
  const yearlyTeams = billedTeams.filter((team) => team.interval === "year");

  if (yearlyTeams.length === 0) {
    return usages;
  }

  const accounts = await Account.query().findByIds(
    yearlyTeams.map((team) => team.accountId),
  );
  const billings = await getAccountBillings(accounts);

  for (const team of yearlyTeams) {
    const billing = billings.get(team.accountId);
    // A plan nothing is metered against has no usage to report and no overage
    // to project — a flat contract is worth its invoices and nothing else.
    if (!billing?.periodUsage || billing.includedScreenshots === null) {
      continue;
    }
    // The two reads shortlist subscriptions differently — a trial counts for
    // one and not the other — so a disagreement on the interval is a
    // disagreement on the subscription, and the term would be a month's usage
    // stretched over a year.
    if (billing.plan?.interval !== "year") {
      continue;
    }

    const period = billing.periodUsage.billingPeriods.find(
      (billingPeriod) => !billingPeriod.closed,
    );
    if (!period) {
      continue;
    }

    // How much of the term the count was measured over, and how much of it
    // there is — `to` is the moment the period was read, so the two are the
    // ratio the trend is carried forward at.
    const elapsed = period.to.getTime() - period.from.getTime();
    const term = period.endsAt.getTime() - period.from.getTime();
    if (elapsed <= 0 || term <= 0) {
      continue;
    }

    const included = billing.includedScreenshots;
    const projectedScreenshotsCount = Math.round(
      (period.screenshotsCount * term) / elapsed,
    );
    // Storybook screenshots are billed at their own rate, and nothing here
    // carries the split they were consumed in — so the overage already run up
    // is what states the blend, at the price the term is actually billed at.
    // Only a term that has gone over states one; before that the neutral price
    // is the closest thing there is, and it is what nearly every screenshot
    // past a quota is billed at.
    const additional = Math.max(0, period.screenshotsCount - included);
    const unitPrice =
      additional > 0
        ? period.additionalScreenshotCost / additional
        : (team.additionalScreenshotPrice ?? 0);
    const projectedAdditional = Math.max(
      0,
      projectedScreenshotsCount - included,
    );
    const currency = team.currency ?? REPORTING_CURRENCY;
    const priceInEuros = (amount: number) => toEuros({ amount, currency });

    // The term cut into twelve, so a month of it is the same twelfth the
    // contract beside it is amortized into — not a calendar month, which a
    // term running from the 13th never lines up with anyway.
    const elapsedMonths = (elapsed * 12) / term;
    const monthlyAmount = period.additionalScreenshotCost / elapsedMonths;

    usages.set(team.stripeCustomerId, {
      usage: {
        periodFrom: period.from,
        periodEndsAt: period.endsAt,
        screenshotsCount: period.screenshotsCount,
        includedScreenshots: included,
        additionalCost: priceInEuros(period.additionalScreenshotCost),
        additionalPrice: {
          amount: period.additionalScreenshotCost,
          currency,
        },
        monthlyAdditionalCost: priceInEuros(monthlyAmount),
        projectedScreenshotsCount,
        projectedAdditionalCost: priceInEuros(projectedAdditional * unitPrice),
      },
      accrued: { amount: period.additionalScreenshotCost, currency },
      monthlyAccrued: { amount: monthlyAmount, currency },
      from: period.from.getTime(),
      until: period.to.getTime(),
    });
  }

  return usages;
}

/** Raised by the reader when the mirror cannot answer for the window asked. */
export class MirrorCoverageError extends Error {}

/**
 * What the mirror has to have been swept for before a window can be read off
 * it: deep enough to hold the contracts that pay for the window's first month,
 * and recently enough that what it holds is still current. A mirror failing
 * either reports zeros that read as figures.
 */
async function assertMirrorCovers(scanStart: Date, now: Date): Promise<void> {
  const [deepestSync, freshestSync] = await Promise.all([
    StripeInvoiceSync.query().orderBy("sinceDate", "asc").first(),
    StripeInvoiceSync.query().orderBy("completedAt", "desc").first(),
  ]);

  if (!deepestSync || new Date(deepestSync.sinceDate) > scanStart) {
    throw new MirrorCoverageError(
      "The Stripe invoice mirror was never swept deep enough for this window — run stripe/bin/sync-stripe-invoices with a deeper window to backfill it.",
    );
  }
  invariant(freshestSync, "a deepest sync means there is a freshest one");
  if (
    now.getTime() - new Date(freshestSync.completedAt).getTime() >
    STALE_MIRROR_MS
  ) {
    throw new MirrorCoverageError(
      `The Stripe invoice mirror has not been swept since ${freshestSync.completedAt} — the stripe-invoice-sync cron is not running.`,
    );
  }
}

/**
 * The teams behind one month of the monthly plans, largest first.
 *
 * Read a month at a time, on the month a reader opens, rather than beside the
 * figures: a line carries the usage its team got through, and pricing thirteen
 * months of that to draw one is the difference between a page that reads a
 * handful of rows and one that walks every screenshot bucket of the year.
 * Bounded to the month's own customers, it is the shape the
 * `(projectId, createdAt)` index was built for.
 *
 * The running month also carries the bills its cycles have not raised yet.
 */
export async function getStaffRevenueMonthTeams(
  month: Date,
): Promise<StaffRevenueMonthTeam[]> {
  const now = new Date();
  const start = startOfUTCMonth(month, 0);
  const end = startOfUTCMonth(month, 1);
  const bound = { start: start.getTime(), end: end.getTime() };
  const scanStart = new Date(bound.start - CONTRACT_SCAN_MS);

  await assertMirrorCovers(scanStart, now);

  const [teamCustomers, billedTeams, rows] = await Promise.all([
    getTeamCustomers(),
    getBilledTeams(),
    StripeInvoice.query()
      .whereIn("status", COUNTED_STATUSES)
      .whereIn("billingReason", [
        ...SUBSCRIPTION_BILLING_REASONS,
        ...SALES_LED_BILLING_REASONS,
      ])
      .where("stripeCreatedAt", ">=", start.toISOString())
      .where("stripeCreatedAt", "<", end.toISOString()),
  ]);

  const customerIds = [...new Set(rows.map((row) => row.stripeCustomerId))];
  // The terms are looked up for this month's customers alone, over the same
  // stretch the whole-window read scans: what tells a period-less sales
  // invoice from a one-off is a bill of theirs that covers a term, and that
  // bill can have been raised a year before the month being read.
  const termRows =
    customerIds.length === 0
      ? []
      : ((await StripeInvoice.query()
          .select(
            "stripeCustomerId",
            "stripeCreatedAt",
            "periodStart",
            "periodEnd",
          )
          .whereIn("stripeCustomerId", customerIds)
          .where("stripeCreatedAt", ">=", scanStart.toISOString())
          .where(
            "stripeCreatedAt",
            "<",
            end.toISOString(),
          )) as unknown as (ClassifiableInvoice & {
          stripeCustomerId: string;
        })[]);
  const customersWithTerms = getCustomersWithTerms(
    termRows.map((row) => ({ ...row, billingReason: null })),
  );

  const accountIds = customerIds
    .map((customerId) => teamCustomers.get(customerId)?.accountId)
    .filter((accountId) => accountId !== undefined);
  const screenshots = await getMonthlyScreenshots({
    from: start,
    to: end,
    accountIds,
  });
  const monthKey = getMonthKey(start);
  const billedTeamsByCustomer = new Map(
    billedTeams.map((team) => [team.stripeCustomerId, team]),
  );

  const teams = new Map<string, StaffRevenueMonthTeam>();
  for (const row of rows) {
    const team = teamCustomers.get(row.stripeCustomerId);
    if (!team) {
      continue;
    }
    const revenue = getInvoiceRevenue(row);
    const classified = classifyInvoice(row, {
      customerHasTerm: customersWithTerms.has(row.stripeCustomerId),
    });
    // A contract belongs to the months it pays for, which the yearly figures
    // and their own table report. A zero invoice is not a team being invoiced.
    if (classified.kind === "contract" || revenue.amount === 0) {
      continue;
    }

    // A team invoiced twice in one month is one team, one line deeper.
    let teamRow = teams.get(row.stripeCustomerId);
    if (!teamRow) {
      teamRow = {
        slug: team.slug,
        name: team.name,
        stripeCustomerId: row.stripeCustomerId,
        amount: 0,
        currency: revenue.currency,
        revenue: 0,
        screenshotsCount: screenshots.get(team.accountId)?.get(monthKey) ?? 0,
        ...getPlanColumns(billedTeamsByCustomer.get(row.stripeCustomerId)),
        invoices: [],
        estimatedAt: null,
      };
      teams.set(row.stripeCustomerId, teamRow);
    }
    teamRow.amount += revenue.amount;
    if (teamRow.currency !== revenue.currency) {
      // Mixed currencies make the original sum meaningless; the euro figure
      // still holds.
      teamRow.currency = null;
    }
    teamRow.revenue += toEuros(revenue);
    teamRow.invoices.push({
      amount: revenue.amount,
      currency: revenue.currency,
      invoicedAt: new Date(row.stripeCreatedAt),
    });
  }

  // The query reads the mirror in no particular order.
  for (const team of teams.values()) {
    team.invoices.sort(
      (a, b) => b.invoicedAt.getTime() - a.invoicedAt.getTime(),
    );
  }

  const estimates =
    bound.start === startOfUTCMonth(now, 0).getTime()
      ? await getEstimatedBills({ billedTeams, runningMonth: bound })
      : [];

  // Largest first: the breakdown is read to see who made the month.
  return [...teams.values(), ...estimates].sort(
    (a, b) => b.revenue - a.revenue,
  );
}

/**
 * What Argos invoiced over the last `monthCount` calendar months, along with
 * the annual contracts the yearly figures are made of.
 *
 * Read from the `stripe_invoices` mirror, and read invoice by invoice: what a
 * month reports is what was raised in it, and what a contract is worth is
 * spread over the months it pays for. Nothing consults what plan a team is on
 * today, so a conversion, a churn or a hand-billed deal cannot rewrite a month
 * that has already been reported.
 */
export async function getStaffRevenue(
  monthCount: number,
): Promise<StaffRevenue> {
  invariant(
    monthCount >= 1 && monthCount <= MAX_MONTHS,
    `monthCount must be between 1 and ${MAX_MONTHS}`,
  );

  const now = new Date();
  const reported = Array.from({ length: monthCount }, (_, index) =>
    startOfUTCMonth(now, index - monthCount + 1),
  );
  const end = startOfUTCMonth(now, 1);
  const first = reported[0];
  invariant(first, "at least one month is reported");
  const scanStart = new Date(first.getTime() - CONTRACT_SCAN_MS);

  const [teamCustomers, billedTeams, marketplaceSubscriptions] =
    await Promise.all([
      getTeamCustomers(),
      getBilledTeams(),
      getMarketplaceSubscriptions(),
    ]);

  await assertMirrorCovers(scanStart, now);

  const rows = await StripeInvoice.query()
    .whereIn("status", COUNTED_STATUSES)
    .whereIn("billingReason", [
      ...SUBSCRIPTION_BILLING_REASONS,
      ...SALES_LED_BILLING_REASONS,
    ])
    .where("stripeCreatedAt", ">=", scanStart.toISOString())
    .where("stripeCreatedAt", "<", end.toISOString());

  const customersWithTerms = getCustomersWithTerms(rows);

  // The months, and the contracts, from the same read. The teams behind a
  // month are counted here and read one month at a time by the query below:
  // building them all would price thirteen months of usage to draw one.
  const monthSplits = reported.map(() => createSplit());
  const monthCustomers = reported.map(() => new Set<string>());
  const yearlySplits = reported.map(() => createSplit());
  const yearlyMonthCustomers = reported.map(() => new Set<string>());
  const contractReads: ContractRead[] = [];

  // A month is a calendar month for the bills raised in it, and only as long
  // as it has been for the contracts spread over it: a contract's share of a
  // month still filling has to be as partial as the invoices beside it, while
  // a bill raised a second ago still belongs to the month it was raised in.
  const monthBounds = reported.map((start, index) => ({
    start: start.getTime(),
    end: (reported[index + 1] ?? end).getTime(),
  }));
  const amortizeBounds = monthBounds.map((bound) => ({
    start: bound.start,
    end: Math.min(bound.end, now.getTime()),
  }));

  for (const row of rows) {
    const team = teamCustomers.get(row.stripeCustomerId);
    if (!team) {
      continue;
    }
    const revenue = getInvoiceRevenue(row);
    const classified = classifyInvoice(row, {
      customerHasTerm: customersWithTerms.has(row.stripeCustomerId),
    });
    if (classified.kind === "contract") {
      const termMs = classified.coverage.end - classified.coverage.start;
      contractReads.push({
        row,
        revenue,
        coverage: classified.coverage,
        termMs,
        isFullTerm: termMs >= ANNUAL_PERIOD_MS,
      });
      continue;
    }

    // A zero invoice — a usage month under the quota, the opening of a
    // sales-created subscription — is not a team being invoiced. Only the
    // monthly side drops it: a contract fully discounted or fully credited is
    // worth nothing, which is a figure, where dropping it would report the
    // team as having no contract anyone could find.
    if (revenue.amount === 0) {
      continue;
    }

    // A monthly bill belongs to the month it was raised in, and only the
    // reported window holds months to raise it in.
    const created = new Date(row.stripeCreatedAt).getTime();
    if (created < first.getTime()) {
      continue;
    }
    const index = monthBounds.findIndex(
      (bound) => created >= bound.start && created < bound.end,
    );
    const split = monthSplits[index];
    const customers = monthCustomers[index];
    invariant(
      split && customers,
      "the query bounds every row to a reported month",
    );
    addToSplit(split, revenue);
    // A team invoiced twice in one month is one team.
    customers.add(row.stripeCustomerId);
  }

  // Contracts, once their terms no longer overlap: spread each one over the
  // months its money pays for, and remember what each contributes to the
  // running month for the table to report.
  const contracts = clipContractTerms(contractReads);
  const runningIndex = reported.length - 1;
  const runningMonth = monthBounds[runningIndex];
  invariant(runningMonth, "the running month is one of the reported ones");
  const monthlyByCustomer = new Map<string, number>();
  /** The contracts over the whole running month, for the projection. */
  const projectedYearly = createSplit();

  for (const contract of contracts) {
    const coveredMs = contract.termMs;
    if (coveredMs <= 0 || contract.coverage.end <= contract.coverage.start) {
      continue;
    }
    for (const [index, bound] of amortizeBounds.entries()) {
      const overlap =
        Math.min(contract.coverage.end, bound.end) -
        Math.max(contract.coverage.start, bound.start);
      if (overlap <= 0) {
        continue;
      }
      const split = yearlySplits[index];
      const customers = yearlyMonthCustomers[index];
      invariant(split && customers, "bounds and splits are built together");
      const share = {
        amount: (contract.revenue.amount * overlap) / coveredMs,
        currency: contract.revenue.currency,
      };
      addToSplit(split, share);
      customers.add(contract.row.stripeCustomerId);
    }

    // What the contract is worth over a whole month, which is what the table
    // reports — the running month's own share is partial by design, and a
    // contract's monthly worth is not.
    const monthOverlap =
      Math.min(contract.coverage.end, runningMonth.end) -
      Math.max(contract.coverage.start, runningMonth.start);
    if (monthOverlap > 0) {
      const monthShare = {
        amount: (contract.revenue.amount * monthOverlap) / coveredMs,
        currency: contract.revenue.currency,
      };
      addToSplit(projectedYearly, monthShare);
      monthlyByCustomer.set(
        contract.row.stripeCustomerId,
        (monthlyByCustomer.get(contract.row.stripeCustomerId) ?? 0) +
          toEuros(monthShare),
      );
    }
  }

  // Two usage reads over two disjoint sets — the monthly cycles about to bill,
  // and the annual terms running — so neither waits on the other.
  const [estimatedBills, contractUsages] = await Promise.all([
    getEstimatedBills({ billedTeams, runningMonth }),
    getContractUsages(billedTeams),
  ]);

  // The overage the running terms have run up, spread day by day over the part
  // of each term that has gone by — the rule the contracts themselves are
  // amortized by, applied to the one thing on this page no invoice accounts
  // for. Nothing reaches the months before the running term: a closed term's
  // overage was billed on the renewal that opened the next one, so it is
  // already inside the contract invoices and would be counted twice.
  for (const [customerId, read] of contractUsages) {
    const accruedMs = read.until - read.from;
    if (accruedMs <= 0) {
      continue;
    }
    for (const [index, bound] of amortizeBounds.entries()) {
      const overlap =
        Math.min(read.until, bound.end) - Math.max(read.from, bound.start);
      if (overlap <= 0) {
        continue;
      }
      const split = yearlySplits[index];
      const customers = yearlyMonthCustomers[index];
      invariant(split && customers, "bounds and splits are built together");
      addToSplit(split, {
        amount: (read.accrued.amount * overlap) / accruedMs,
        currency: read.accrued.currency,
      });
      customers.add(customerId);
    }
    // A running term holds today, so it is one of the running month's — and
    // the projection carries a whole month of it, like the contract above.
    addToSplit(projectedYearly, read.monthlyAccrued);
  }

  for (const [index, split] of yearlySplits.entries()) {
    const customers = yearlyMonthCustomers[index];
    invariant(customers, "splits and customers are built together");
    split.teamsCount = customers.size;
  }

  // What the running month is heading for, rather than what it has billed: the
  // bills its cycles have not raised yet, and the two rates carried to the end
  // of the month instead of stopped at today.
  const runningSplit = monthSplits[runningIndex];
  invariant(runningSplit, "the running month has a split of its own");
  const estimated = estimatedBills.reduce((sum, bill) => sum + bill.revenue, 0);
  const projectedMonthly = runningSplit.revenue + estimated;
  const projectedGithub = getMarketplaceMonthRevenue(
    marketplaceSubscriptions,
    runningMonth,
    runningMonth,
  );

  const months = reported.map((start, index) => {
    const monthly = monthSplits[index];
    const yearly = yearlySplits[index];
    const customers = monthCustomers[index];
    invariant(
      monthly && yearly && customers,
      "every month reported has totals",
    );
    monthly.teamsCount = customers.size;
    const bound = monthBounds[index];
    invariant(bound, "every month reported has bounds");
    const githubPlans = getMarketplaceMonthRevenue(
      marketplaceSubscriptions,
      bound,
      // As much of the month as has gone by, so the running month's marketplace
      // band is as partial as the two beside it.
      amortizeBounds[index] ?? bound,
    );
    return {
      month: start,
      // All three bands: the card states one figure, and a reader adding the
      // three under it has to arrive at it.
      revenue: monthly.revenue + yearly.revenue + githubPlans.revenue,
      monthlyPlans: monthly,
      yearlyPlans: yearly,
      githubPlans,
    };
  });

  return {
    months,
    yearlyContracts: buildYearlyContracts({
      contracts,
      teamCustomers,
      billedTeams,
      monthlyByCustomer,
      contractUsages,
      runningMonth,
    }),
    projection: {
      revenue:
        projectedMonthly + projectedYearly.revenue + projectedGithub.revenue,
      monthlyPlans: projectedMonthly,
      yearlyPlans: projectedYearly.revenue,
      githubPlans: projectedGithub.revenue,
      estimated,
    },
  };
}

/**
 * The contracts as the table lists them: the ones paying for any part of the
 * running month, plus the teams billed yearly whose contract could not be
 * found at all — an anomaly the figures would otherwise hide, since a contract
 * nobody can find simply contributes nothing.
 *
 * The month rather than today, so the table adds up to the figure it explains:
 * a contract that ran out on the tenth paid for those ten days, and a row that
 * only listed contracts still running would come up short against the card.
 */
function buildYearlyContracts(options: {
  contracts: ContractRead[];
  teamCustomers: Map<string, TeamCustomer>;
  billedTeams: BilledTeam[];
  monthlyByCustomer: Map<string, number>;
  contractUsages: Map<string, ContractUsageRead>;
  runningMonth: { start: number; end: number };
}): StaffYearlyContract[] {
  const {
    contracts,
    teamCustomers,
    billedTeams,
    monthlyByCustomer,
    contractUsages,
    runningMonth,
  } = options;
  const reported = contracts.filter(
    (contract) =>
      contract.coverage.start < runningMonth.end &&
      contract.coverage.end > runningMonth.start,
  );

  const rows: StaffYearlyContract[] = [];
  for (const [customerId, reads] of Map.groupBy(
    reported,
    (read) => read.row.stripeCustomerId,
  )) {
    const team = teamCustomers.get(customerId);
    if (!team) {
      continue;
    }
    const invoices = reads
      .sort(
        (a, b) =>
          new Date(b.row.stripeCreatedAt).getTime() -
          new Date(a.row.stripeCreatedAt).getTime(),
      )
      .map((read) => ({
        amount: read.revenue.amount,
        currency: read.revenue.currency,
        invoicedAt: new Date(read.row.stripeCreatedAt),
        coveredFrom: new Date(read.coverage.start),
        coveredUntil: new Date(read.coverage.end),
        awaitingPayment: read.row.status === "open",
      }));

    rows.push({
      slug: team.slug,
      name: team.name,
      stripeCustomerId: customerId,
      amount: reads.reduce((sum, read) => sum + toEuros(read.revenue), 0),
      monthlyRevenue: monthlyByCustomer.get(customerId) ?? 0,
      invoices,
      // Any of them, not all: the unpaid renewal beside a settled upsell is
      // exactly the one whose collection is worth watching.
      awaitingPayment: invoices.some((invoice) => invoice.awaitingPayment),
      usage: contractUsages.get(customerId)?.usage ?? null,
    });
  }

  // A team Argos bills yearly whose contract no invoice accounts for: listed
  // with nothing, because that is what it contributes, and because the reason
  // is always in Stripe rather than here.
  const accounted = new Set(rows.map((row) => row.stripeCustomerId));
  for (const team of billedTeams) {
    if (team.interval !== "year" || accounted.has(team.stripeCustomerId)) {
      continue;
    }
    rows.push({
      slug: team.slug,
      name: team.name,
      stripeCustomerId: team.stripeCustomerId,
      amount: null,
      monthlyRevenue: 0,
      invoices: [],
      awaitingPayment: false,
      // Reported all the same: the contract nobody can find is exactly the row
      // whose usage says what it should have been worth.
      usage: contractUsages.get(team.stripeCustomerId)?.usage ?? null,
    });
  }

  // Largest first, the contracts nothing accounts for last: the list reads as
  // the figures' makeup, and an anomaly is what to end on.
  return rows.sort((a, b) => {
    if (a.amount === null) {
      return b.amount === null ? 0 : 1;
    }
    if (b.amount === null) {
      return -1;
    }
    return b.amount - a.amount;
  });
}
