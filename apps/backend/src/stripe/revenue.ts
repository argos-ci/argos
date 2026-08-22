import { invariant } from "@argos/util/invariant";
import type Stripe from "stripe";

import config from "@/config";
import { Account, Subscription } from "@/database/models";

import { stripe } from "./index";

/** What the teams on one billing interval contributed to a month. */
type StaffRevenueSplit = {
  revenue: number;
  teamsCount: number;
  /**
   * The part of `revenue` invoiced in a currency other than US dollars, added
   * in at parity.
   *
   * Stripe states each invoice in the currency it was raised in, and converting
   * one into another needs a rate on the day, which nothing here has. So a euro
   * invoice is counted as though it were dollars — the rule the staff pages
   * already print amounts under — and this says how much of the figure rests on
   * that, which is the only honest thing to do short of an exchange rate.
   */
  foreignRevenue: number;
};

/** What Argos billed over one calendar month. */
export type StaffRevenueMonth = {
  /** The first instant of the month, in UTC — what names it on screen. */
  month: Date;
  /** The two splits below, added up. */
  revenue: number;
  /** What teams billed by the month were invoiced that month. */
  monthlyPlans: StaffRevenueSplit;
  /**
   * What the annual contracts in force are worth per month: their latest
   * renewal over twelve.
   *
   * The same on every month, being a rate. Amortizing each annual invoice over
   * the twelve months it covers would be exact, but it would mean reading a
   * year of invoices to report one month.
   */
  yearlyPlans: StaffRevenueSplit;
};

/**
 * Upper bound on the window one call will read.
 *
 * Every month is a walk of its own, so the cost grows with the count asked for.
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

/**
 * Requests in flight at once.
 *
 * The months and the annual contracts are all independent, so nothing here
 * needs to wait — but Stripe rate-limits per account and the client is built
 * without retries, so an unbounded fan-out turns a wide account into a 429 that
 * fails the whole page.
 */
const MAX_CONCURRENT_REQUESTS = 8;

/** The currency every amount on the staff pages is printed in. */
const REPORTING_CURRENCY = "usd";

/**
 * Why Stripe raised an invoice, for the ones that are a subscription being
 * billed rather than something invoiced on the side.
 *
 * A one-off invoice or an accepted quote is revenue, but it is not what a
 * column headed by a billing interval reports — and a customer of the Stripe
 * account that is not an Argos team has no business in this page at all.
 */
const SUBSCRIPTION_BILLING_REASONS = new Set<Stripe.Invoice.BillingReason>([
  "subscription",
  "subscription_create",
  "subscription_cycle",
  "subscription_threshold",
  "subscription_update",
]);

/**
 * The reasons a renewal is raised under, which is the only invoice worth
 * dividing by twelve.
 *
 * Narrower than the set above on purpose: a mid-year proration is real revenue
 * for the month it lands in, but a twelfth of it is not what the contract is
 * worth per month.
 */
const RENEWAL_BILLING_REASONS = new Set<Stripe.Invoice.BillingReason>([
  "subscription_create",
  "subscription_cycle",
]);

/** The placeholder the config falls back to when no key is configured. */
const MISSING_API_KEY = "no-api-key";

/** A team Argos bills through Stripe, and how it is billed. */
type BilledTeam = {
  accountId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  interval: "month" | "year";
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
      "accounts.stripeCustomerId",
      "plan.interval",
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
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    interval: "month" | "year";
  }[];

  return rows.map((row) => ({
    accountId: String(row.accountId),
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    interval: row.interval,
  }));
}

/**
 * Every Stripe customer that is an Argos team, whether or not it still pays.
 *
 * Read over all team accounts rather than over the billed ones: a team that has
 * since churned keeps the invoices it was already sent, and a month it was
 * invoiced in would otherwise lose it — which is exactly the revenue a
 * comparison between two months exists to show. Personal accounts are left out,
 * so what they may have been invoiced never reaches a page about teams.
 */
export async function getTeamCustomerIds(): Promise<Set<string>> {
  const rows = (await Account.query()
    .select("stripeCustomerId")
    .whereNotNull("teamId")
    .whereNull("userId")
    .whereNotNull("stripeCustomerId")) as unknown as {
    stripeCustomerId: string;
  }[];

  return new Set(rows.map((row) => row.stripeCustomerId));
}

/** What one invoice contributed, in the currency it was raised in. */
export type InvoiceRevenue = { amount: number; currency: string };

/**
 * What one invoice contributed to revenue, in the currency's main unit.
 *
 * Excluding tax, because VAT collected on behalf of a state is not revenue, and
 * net of credit notes, because an invoice refunded after the fact keeps its
 * `amount_paid` intact — reading that field alone would count money that was
 * given back.
 */
export function getInvoiceRevenue(invoice: {
  currency: string;
  total: number;
  total_excluding_tax: number | null;
  /** Only the amounts are read, so the rest of Stripe's shape is not asked for. */
  total_taxes: { amount: number }[] | null;
  pre_payment_credit_notes_amount: number;
  post_payment_credit_notes_amount: number;
}): InvoiceRevenue {
  // Null on invoices Stripe states no pre-tax total for. The taxes it lists are
  // taken off the total instead, rather than letting the tax through as
  // revenue — falling back to `total` alone would overstate every invoice that
  // collected VAT, and say nothing about it.
  const excludingTax =
    invoice.total_excluding_tax ??
    invoice.total -
      (invoice.total_taxes ?? []).reduce((sum, tax) => sum + tax.amount, 0);

  const credited =
    invoice.pre_payment_credit_notes_amount +
    invoice.post_payment_credit_notes_amount;

  return {
    // Stripe states amounts in the currency's minor unit.
    amount: (excludingTax - credited) / 100,
    currency: invoice.currency,
  };
}

function createSplit(): StaffRevenueSplit {
  return { revenue: 0, teamsCount: 0, foreignRevenue: 0 };
}

function createMonth(month: Date): StaffRevenueMonth {
  return {
    month,
    revenue: 0,
    monthlyPlans: createSplit(),
    yearlyPlans: createSplit(),
  };
}

/** Add one invoice to a split, tracking what of it was not in dollars. */
function addToSplit(split: StaffRevenueSplit, revenue: InvoiceRevenue): void {
  split.revenue += revenue.amount;
  if (revenue.currency !== REPORTING_CURRENCY) {
    split.foreignRevenue += revenue.amount;
  }
}

/**
 * The first instant of the month `offset` months back, in UTC.
 *
 * Deliberately not the calendar helpers, which work in the process's own
 * timezone: Stripe timestamps every invoice in UTC, so a server running on
 * anything else would cut its months hours away from where Stripe cuts them and
 * file the invoices either side of a boundary in the wrong one.
 */
export function startOfUTCMonth(date: Date, offset: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1),
  );
}

/** Run `work` over `items`, never more than `MAX_CONCURRENT_REQUESTS` at once. */
async function mapWithLimit<Item, Result>(
  items: Item[],
  work: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = Array.from({ length: items.length });
  let next = 0;

  const runners = Array.from(
    { length: Math.min(MAX_CONCURRENT_REQUESTS, items.length) },
    async () => {
      for (let index = next++; index < items.length; index = next++) {
        const item = items[index];
        invariant(item !== undefined, "index is inside the list");
        results[index] = await work(item);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

/**
 * What the annual contracts in force are worth per month.
 *
 * One small request per annual team rather than a year of invoices for
 * everyone: an annual subscription renews once a year, so its latest renewal is
 * what it is worth now.
 *
 * Listed by subscription and narrowed to a renewal, not simply the customer's
 * latest paid invoice: an add-on bought mid-year is the most recent invoice a
 * customer paid, and a twelfth of it would replace the contract's own amount
 * with a rounding error.
 *
 * A contract whose first renewal has not been paid yet counts nothing — it has
 * been invoiced nothing, which is what this reports.
 */
async function getYearlyRate(teams: BilledTeam[]): Promise<StaffRevenueSplit> {
  const yearlyTeams = teams.filter((team) => team.interval === "year");
  const split = createSplit();

  const invoices = await mapWithLimit(yearlyTeams, async (team) => {
    // A handful rather than one: the latest invoice on a subscription can be a
    // proration, and the renewal is the one behind it.
    const page = await stripe.invoices.list({
      subscription: team.stripeSubscriptionId,
      status: "paid",
      limit: 10,
    });
    return (
      page.data.find(
        (invoice) =>
          invoice.billing_reason !== null &&
          RENEWAL_BILLING_REASONS.has(invoice.billing_reason),
      ) ?? null
    );
  });

  for (const invoice of invoices) {
    if (!invoice) {
      continue;
    }
    const revenue = getInvoiceRevenue(invoice);
    addToSplit(split, {
      amount: revenue.amount / MONTHS_PER_YEAR,
      currency: revenue.currency,
    });
    split.teamsCount += 1;
  }

  return split;
}

/**
 * Walk one month's invoices.
 *
 * A chain per month rather than one chain over the whole window, because
 * Stripe's pagination is a cursor: a page cannot be asked for until the one
 * before it has answered, so a single walk over a year is a year of round trips
 * end to end. Split by month they run at once, and each chain knows the bucket
 * its invoices belong to.
 */
async function readMonth(options: {
  from: Date;
  to: Date;
  /** Customers that are Argos teams — everything else is not this page's. */
  teamCustomerIds: Set<string>;
  /** Yearly contracts are reported as a rate, so their invoices are skipped. */
  yearlyCustomerIds: Set<string>;
}): Promise<StaffRevenueSplit> {
  const { from, to, teamCustomerIds, yearlyCustomerIds } = options;
  const split = createSplit();
  const customerIds = new Set<string>();
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
    if (!customerId || !teamCustomerIds.has(customerId)) {
      continue;
    }
    if (yearlyCustomerIds.has(customerId)) {
      continue;
    }
    if (
      invoice.billing_reason === null ||
      !SUBSCRIPTION_BILLING_REASONS.has(invoice.billing_reason)
    ) {
      continue;
    }

    addToSplit(split, getInvoiceRevenue(invoice));
    // A team invoiced twice in one month is one team.
    customerIds.add(customerId);
  }

  split.teamsCount = customerIds.size;
  return split;
}

/**
 * What Argos invoiced over the last `monthCount` calendar months, oldest first
 * and the running one last.
 *
 * Asked of Stripe on every call rather than mirrored into a table or held in a
 * cache: the invoices are the answer, they change behind us as they are paid,
 * voided and credited, and a copy of them is a second source to keep correct.
 */
export async function getStaffRevenue(
  monthCount: number,
): Promise<StaffRevenueMonth[]> {
  invariant(
    monthCount >= 1 && monthCount <= MAX_MONTHS,
    `monthCount must be between 1 and ${MAX_MONTHS}`,
  );

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

  const [teams, teamCustomerIds] = await Promise.all([
    getBilledTeams(),
    getTeamCustomerIds(),
  ]);
  const yearlyCustomerIds = new Set(
    teams
      .filter((team) => team.interval === "year")
      .map((team) => team.stripeCustomerId),
  );

  const reported = starts.slice(0, monthCount);
  const [yearlyRate, totals] = await Promise.all([
    getYearlyRate(teams),
    mapWithLimit(
      reported.map((from, index) => {
        const to = starts[index + 1];
        invariant(to, "every month reported has a bound");
        return { from, to };
      }),
      (window) => readMonth({ ...window, teamCustomerIds, yearlyCustomerIds }),
    ),
  ]);

  return reported.map((start, index) => {
    const month = createMonth(start);
    const total = totals[index];
    invariant(total, "every month reported has totals");
    month.monthlyPlans = total;
    // Copied rather than shared: one object held by every month is one object
    // a later change can mutate for all of them at once.
    month.yearlyPlans = { ...yearlyRate };
    month.revenue = total.revenue + yearlyRate.revenue;
    return month;
  });
}
