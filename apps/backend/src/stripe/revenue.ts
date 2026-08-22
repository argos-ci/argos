import type Stripe from "stripe";

import config from "@/config";
import { Subscription } from "@/database/models";
import { redisCache } from "@/util/redis";

import { stripe } from "./index";

/** What the teams on one billing interval contributed to a month. */
type StaffRevenueSplit = {
  revenue: number;
  teamsCount: number;
};

/** What Argos billed over one calendar month. */
export type StaffRevenueMonth = {
  /** The first instant of the month, in UTC — what names it on screen. */
  month: Date;
  /** The two splits below, added up. */
  revenue: number;
  /**
   * What teams billed by the month were invoiced that month — the invoices
   * themselves, so discounts, credit notes and negotiated amounts are already
   * in it.
   */
  monthlyPlans: StaffRevenueSplit;
  /**
   * What the annual contracts in force are worth per month: their latest
   * invoice over twelve.
   *
   * The same on every month, being a rate. Amortizing each annual invoice over
   * the twelve months it covers would be exact, but it would mean reading a
   * year of invoices to report one month — the one thing this cannot afford,
   * being asked at page load.
   */
  yearlyPlans: StaffRevenueSplit;
};

/**
 * Upper bound on the window one call will read.
 *
 * Every month is a walk of its own, so the cost grows with the count asked for
 * — bounded here rather than left to the caller, which is what keeps a request
 * from turning into a hundred round trips.
 */
export const MAX_MONTHS = 24;

/**
 * Upper bound on the invoices one month's walk will read.
 *
 * Reached means a month holds more than this service can read in the time a
 * page will wait, and the answer is to stop reading Stripe on every request —
 * not to report the total of however many invoices happened to fit, which would
 * read as a complete figure while silently missing the rest.
 */
const MAX_INVOICES_PER_MONTH = 2000;

/** Page size, which is also Stripe's maximum. */
const PAGE_SIZE = 100;

/** Months a yearly contract is spread over. */
const MONTHS_PER_YEAR = 12;

/** The placeholder the config falls back to when no key is configured. */
const MISSING_API_KEY = "no-api-key";

/** A team Argos bills through Stripe, and how it is billed. */
type BilledTeam = {
  accountId: string;
  stripeCustomerId: string;
  interval: "month" | "year";
};

/**
 * Every team with a paying subscription, and the interval it is billed on.
 *
 * Reads the subscription the same way `getAccountBillings` does — the highest
 * quota among those active, so an account holding two resolves the same one on
 * both sides. Granted plans are excluded: they bill nothing, so no invoice of
 * theirs exists to find.
 */
export async function getBilledTeams(): Promise<BilledTeam[]> {
  const rows = (await Subscription.query()
    .select(
      "subscriptions.accountId",
      "accounts.stripeCustomerId",
      "plan.interval",
    )
    .joinRelated("plan")
    .join("accounts", "accounts.id", "subscriptions.accountId")
    .whereNotNull("accounts.teamId")
    .whereNull("accounts.userId")
    .whereNull("accounts.forcedPlanId")
    .whereNotNull("accounts.stripeCustomerId")
    .whereRaw("?? < now()", "subscriptions.startDate")
    // A trial is out: it resolves a plan like a paid subscription and pays
    // nothing. `past_due` is in — the invoice was raised, whether it clears is
    // a collection question.
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
    stripeCustomerId: string;
    interval: "month" | "year";
  }[];

  return rows.map((row) => ({
    accountId: String(row.accountId),
    stripeCustomerId: row.stripeCustomerId,
    interval: row.interval,
  }));
}

/**
 * What one invoice contributed to revenue, in the currency's main unit.
 *
 * Excluding tax, because VAT collected on behalf of a state is not revenue, and
 * net of credit notes, because an invoice refunded after the fact keeps its
 * `amount_paid` intact — reading that field alone would count money that was
 * given back.
 *
 * Currencies are added at parity, the rule the staff pages already print
 * amounts under: a euro contract is read as dollars rather than converted.
 */
export function getInvoiceRevenue(
  invoice: Pick<
    Stripe.Invoice,
    | "total"
    | "total_excluding_tax"
    | "pre_payment_credit_notes_amount"
    | "post_payment_credit_notes_amount"
  >,
): number {
  // Null on invoices Stripe states no tax breakdown for, where the total is
  // already the whole of it.
  const excludingTax = invoice.total_excluding_tax ?? invoice.total;
  const credited =
    invoice.pre_payment_credit_notes_amount +
    invoice.post_payment_credit_notes_amount;

  // Stripe states amounts in the currency's minor unit.
  return (excludingTax - credited) / 100;
}

function createSplit(): StaffRevenueSplit {
  return { revenue: 0, teamsCount: 0 };
}

function createMonth(month: Date): StaffRevenueMonth {
  return {
    month,
    revenue: 0,
    monthlyPlans: createSplit(),
    yearlyPlans: createSplit(),
  };
}

/**
 * The first instant of the month `offset` months back, in UTC.
 *
 * Deliberately not the calendar helpers, which work in the process's own
 * timezone: Stripe timestamps every invoice in UTC, so a server running on
 * anything else would cut its months hours away from where Stripe cuts them and
 * file the invoices either side of a boundary in the wrong one. Reading UTC on
 * both sides is what makes the figure independent of where it runs.
 */
export function startOfUTCMonth(date: Date, offset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1),
  );
}

/**
 * What the annual contracts in force are worth per month.
 *
 * One small request per annual team rather than a year of invoices for
 * everyone: an annual subscription raises one invoice a year, so its latest is
 * what it is worth now, and there are few enough of them to ask in parallel.
 *
 * A contract whose first invoice has not been paid yet counts nothing — it has
 * been invoiced nothing, which is what this reports.
 */
async function getYearlyRate(teams: BilledTeam[]): Promise<StaffRevenueSplit> {
  const yearlyTeams = teams.filter((team) => team.interval === "year");
  const split = createSplit();

  const invoices = await Promise.all(
    yearlyTeams.map(async (team) => {
      const page = await stripe.invoices.list({
        customer: team.stripeCustomerId,
        status: "paid",
        limit: 1,
      });
      return page.data[0] ?? null;
    }),
  );

  for (const invoice of invoices) {
    if (!invoice) {
      continue;
    }
    split.revenue += getInvoiceRevenue(invoice) / MONTHS_PER_YEAR;
    split.teamsCount += 1;
  }

  return split;
}

/** What one month's invoices came to, and how many teams they covered. */
type MonthTotals = { revenue: number; teamsCount: number };

/**
 * Walk one month's invoices.
 *
 * A chain per month rather than one chain over the whole window, because
 * Stripe's pagination is a cursor: a page cannot be asked for until the one
 * before it has answered, so a single walk over three months is three months of
 * round trips end to end. Split by month they run at once, and the wall clock
 * becomes the longest month rather than their sum — which is also why the split
 * is by month rather than by an arbitrary slice: each chain then knows the
 * bucket its invoices belong to, with nothing left to sort out afterwards.
 */
async function readMonth(options: {
  from: Date;
  to: Date;
  /** Yearly contracts are reported as a rate, so their invoices are skipped. */
  yearlyCustomerIds: Set<string>;
}): Promise<MonthTotals> {
  const { from, to, yearlyCustomerIds } = options;
  const customerIds = new Set<string>();
  let revenue = 0;
  let count = 0;

  for await (const invoice of stripe.invoices.list({
    created: {
      gte: Math.floor(from.getTime() / 1000),
      lt: Math.floor(to.getTime() / 1000),
    },
    status: "paid",
    limit: PAGE_SIZE,
  })) {
    count += 1;
    if (count > MAX_INVOICES_PER_MONTH) {
      throw new Error(
        `More than ${MAX_INVOICES_PER_MONTH} invoices in one month: reading Stripe per request no longer holds.`,
      );
    }

    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId || yearlyCustomerIds.has(customerId)) {
      continue;
    }

    revenue += getInvoiceRevenue(invoice);
    // A team invoiced twice in one month is one team.
    customerIds.add(customerId);
  }

  return { revenue, teamsCount: customerIds.size };
}

/**
 * What Argos invoiced over the last `monthCount` calendar months, oldest first
 * and the running one last.
 *
 * Asked of Stripe on every call rather than mirrored into a table: the invoices
 * are the answer, and a copy of them is a second source to keep correct as they
 * are voided, refunded and credited.
 */
async function fetchStaffRevenue(
  monthCount: number,
): Promise<StaffRevenueMonth[]> {
  if (config.get("stripe.apiKey") === MISSING_API_KEY) {
    throw new Error(
      "Stripe is not configured, so invoiced revenue cannot be read.",
    );
  }

  const now = new Date();
  // Oldest first, the running month last. One bound past the end, which is not
  // itself a month reported: it closes the last window.
  const starts = Array.from({ length: monthCount + 1 }, (_, index) =>
    startOfUTCMonth(now, index - monthCount + 1),
  );

  const teams = await getBilledTeams();
  // Only the yearly customers are identified, and the monthly bucket takes
  // everything else. Matching invoices against the teams billed *today* would
  // drop the invoices of a team that has since churned — and a month it was
  // invoiced in would quietly lose it, which is exactly the revenue a
  // comparison between two months exists to show.
  const yearlyCustomerIds = new Set(
    teams
      .filter((team) => team.interval === "year")
      .map((team) => team.stripeCustomerId),
  );

  // Every request at once: the months are independent walks, and the yearly
  // rate is its own set of small ones.
  const reported = starts.slice(0, monthCount);
  const [yearlyRate, totals] = await Promise.all([
    getYearlyRate(teams),
    Promise.all(
      reported.map((from, index) => {
        const to = starts[index + 1];
        if (!to) {
          throw new Error("every month reported has a bound");
        }
        return readMonth({ from, to, yearlyCustomerIds });
      }),
    ),
  ]);

  return reported.map((start, index) => {
    const month = createMonth(start);
    const total = totals[index];
    if (!total) {
      throw new Error("every month reported has totals");
    }
    month.monthlyPlans = total;
    month.yearlyPlans = yearlyRate;
    month.revenue = total.revenue + yearlyRate.revenue;
    return month;
  });
}

/**
 * The shape of the cached value, bumped whenever `StaffRevenueMonth` changes.
 *
 * An entry outlives the deploy that changes what this returns, so a field
 * renamed below would otherwise be read back for an hour from a value that no
 * longer has it.
 */
const CACHE_VERSION = 1;

/** How long a window is served from cache. */
const CACHE_MAX_AGE = 60 * 60 * 1000;

/**
 * Long enough for the walks to finish while holding the lock.
 *
 * The lock's TTL, not a deadline on the work: expiring early would let a second
 * request start the same walks rather than wait on them, which is the stampede
 * the cache exists to prevent.
 */
const CACHE_LOCK_TIMEOUT = 60 * 1000;

const staffRevenueStore = redisCache.createStore({
  fetch: fetchStaffRevenue,
  /**
   * Everything the answer is a function of, so no two of them share an entry.
   *
   * The deployment above all. Without it the key is global to the Redis
   * instance and any two apps pointed at one serve each other's totals — which
   * on a developer's machine is not hypothetical: the end-to-end suite and the
   * dev server share `redis://localhost:6380/1`.
   */
  getCacheKey: (monthCount) => [
    "staff-revenue",
    CACHE_VERSION,
    monthCount,
    config.get("pg.connection.host"),
    config.get("pg.connection.database"),
  ],
  maxAge: CACHE_MAX_AGE,
  timeout: CACHE_LOCK_TIMEOUT,
  // Dates do not survive JSON, and the months carry one each.
  deserialize: (raw) => {
    const months = JSON.parse(raw) as (Omit<StaffRevenueMonth, "month"> & {
      month: string;
    })[];
    return months.map((month) => ({ ...month, month: new Date(month.month) }));
  },
});

/**
 * What Argos invoiced, from cache.
 *
 * Cached for an hour because the figures move at the pace of an invoice: the
 * complete months behind them cannot change at all, and the running one gains a
 * handful a day. An hour costs no freshness anyone can use, and it is what
 * keeps a page that walks a year of invoices from walking it again on every
 * visit.
 */
export async function getStaffRevenue(
  monthCount: number,
): Promise<StaffRevenueMonth[]> {
  return staffRevenueStore.get(monthCount);
}
