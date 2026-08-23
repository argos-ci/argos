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
   * The part of `revenue` invoiced in a currency other than euros, converted
   * at the page's fixed rate.
   *
   * Stripe states each invoice in the currency it was raised in; dollars are
   * brought into euros at `EUR_PER_USD`, which is fixed rather than the day's
   * rate — so this says how much of the figure rests on that conversion.
   */
  foreignRevenue: number;
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
};

/** What Argos billed over one calendar month. */
type StaffRevenueMonth = {
  /** The first instant of the month, in UTC — what names it on screen. */
  month: Date;
  /** The two splits below, added up. */
  revenue: number;
  /** What teams billed by the month were invoiced that month. */
  monthlyPlans: StaffRevenueSplit;
  /** The teams behind `monthlyPlans`, largest first — they sum to it. */
  teams: StaffRevenueMonthTeam[];
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

/**
 * What GitHub Marketplace brings in a month, in dollars, gross of the 5%
 * GitHub keeps.
 *
 * A constant rather than a lookup: the marketplace book is a handful of teams
 * and barely moves, and GitHub exposes no invoice API to read it from — copy
 * the statement's total here when it changes. From the 2026-05 statement.
 */
const GITHUB_MARKETPLACE_MONTHLY_USD = 1540;

/**
 * Why Stripe raised an invoice, for the ones that are a subscription being
 * billed.
 *
 * Not the whole story for the monthly walk: the odd legacy or partner deal is
 * billed by hand, month after month, and those invoices carry the sales-led
 * reasons below instead. The walk takes both; what stays out is `upcoming` —
 * a preview, not an invoice — and pending-item sweeps, which duplicate what
 * the cycle will bill.
 */
const SUBSCRIPTION_BILLING_REASONS = new Set<Stripe.Invoice.BillingReason>([
  "subscription",
  "subscription_create",
  "subscription_cycle",
  "subscription_threshold",
  "subscription_update",
]);

/**
 * A line covering at least this long reads as a year's bill.
 *
 * Under a full year on purpose: an annual invoice raised a few weeks into the
 * period it covers, or prorated at conversion, still has to read as the
 * contract — where a monthly cycle or a one-month true-up never comes close.
 */
const ANNUAL_PERIOD_SECONDS = 300 * 24 * 3600;

/** A day, under which a line's period is a bookkeeping point, not coverage. */
const DAY_SECONDS = 24 * 3600;

/**
 * The reasons an invoice is raised by a person rather than by a billing cycle.
 *
 * Sales-led deals are billed this way — a dashboard invoice or an accepted
 * quote, often carried by no subscription at all — whether the deal is an
 * annual contract or a legacy team invoiced by hand every month. Their line
 * periods are frequently missing or degenerate, so they cannot be recognized
 * by coverage the way cycle invoices can.
 */
const SALES_LED_BILLING_REASONS = new Set<Stripe.Invoice.BillingReason>([
  "manual",
  "quote_accept",
]);

/** The placeholder the config falls back to when no key is configured. */
const MISSING_API_KEY = "no-api-key";

/** A team Argos bills through Stripe, and how it is billed. */
type BilledTeam = {
  accountId: string;
  slug: string;
  name: string | null;
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
      "accounts.slug",
      "accounts.name",
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
    slug: string;
    name: string | null;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    interval: "month" | "year";
  }[];

  return rows.map((row) => ({
    accountId: String(row.accountId),
    slug: row.slug,
    name: row.name,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    interval: row.interval,
  }));
}

/** How a month's breakdown names a team. */
type TeamCustomer = {
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
    .select("stripeCustomerId", "slug", "name")
    .whereNotNull("teamId")
    .whereNull("userId")
    .whereNotNull("stripeCustomerId")) as unknown as {
    stripeCustomerId: string;
    slug: string;
    name: string | null;
  }[];

  return new Map(
    rows.map((row) => [
      row.stripeCustomerId,
      { slug: row.slug, name: row.name },
    ]),
  );
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

/**
 * An invoice's contribution in euros: dollars at the fixed rate, euros as
 * they are. A currency this page does not know stays at parity — and lands in
 * the foreign share, so the caveat covers it either way.
 */
export function toEuros(revenue: InvoiceRevenue): number {
  return revenue.currency === "usd"
    ? revenue.amount * EUR_PER_USD
    : revenue.amount;
}

function createSplit(): StaffRevenueSplit {
  return { revenue: 0, teamsCount: 0, foreignRevenue: 0 };
}

function createMonth(month: Date): StaffRevenueMonth {
  return {
    month,
    revenue: 0,
    monthlyPlans: createSplit(),
    teams: [],
    yearlyPlans: createSplit(),
  };
}

/** Add one invoice to a split, in euros, tracking what was converted. */
function addToSplit(split: StaffRevenueSplit, revenue: InvoiceRevenue): void {
  const amount = toEuros(revenue);
  split.revenue += amount;
  if (revenue.currency !== REPORTING_CURRENCY) {
    split.foreignRevenue += amount;
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

/** One invoice a contract's worth is read from. */
type StaffContractInvoice = {
  /** Net of tax and credit notes, in the currency's main unit. */
  amount: number;
  /** The currency it was raised in, counted at parity when not USD. */
  currency: string;
  /** When it was raised. */
  invoicedAt: Date;
  /** The stretch it covers, when it states a real one. */
  coveredFrom: Date | null;
  coveredUntil: Date | null;
};

/** One annual contract in force, and the invoices its rate is read from. */
type StaffYearlyContract = {
  /** The team's slug, which names its pages. */
  slug: string;
  /** The team's display name, when it has one. */
  name: string | null;
  /** The subscription the database knows the contract by. */
  stripeSubscriptionId: string;
  /**
   * The invoices below added up, in euros. Null when none was found, in which
   * case the contract adds nothing to the rate.
   */
  amount: number | null;
  /** The invoices the contract is worth, newest first. */
  invoices: StaffContractInvoice[];
  /**
   * True when the invoices found are still awaiting payment. Counted all the
   * same — a contract invoice raised is money on its way — and flagged, so
   * collection can be watched.
   */
  awaitingPayment: boolean;
};

/** The parts of an invoice the contract picker reads. */
export type ContractInvoiceCandidate = {
  billing_reason: Stripe.Invoice.BillingReason | null;
  total: number;
  lines: { data: { period: { start: number; end: number } }[] };
};

/** The longest stretch one of the invoice's lines covers, or null. */
function getCoveredPeriod(
  invoice: ContractInvoiceCandidate,
): { start: number; end: number } | null {
  let longest: { start: number; end: number } | null = null;
  for (const line of invoice.lines.data) {
    if (
      !longest ||
      line.period.end - line.period.start > longest.end - longest.start
    ) {
      longest = line.period;
    }
  }
  // A period under a day is a bookkeeping point, not coverage.
  return longest && longest.end - longest.start >= DAY_SECONDS ? longest : null;
}

/** Whether an invoice reads as a contract being billed. */
function isContractInvoice(invoice: ContractInvoiceCandidate): boolean {
  if (invoice.total === 0) {
    // Subscriptions opened by sales to carry a contract start on a zero
    // invoice; the money is on an invoice of its own.
    return false;
  }
  const period = getCoveredPeriod(invoice);
  return (
    (period !== null && period.end - period.start >= ANNUAL_PERIOD_SECONDS) ||
    (invoice.billing_reason !== null &&
      SALES_LED_BILLING_REASONS.has(invoice.billing_reason))
  );
}

/**
 * The invoices a contract's worth is read from, among the customer's invoices,
 * newest first.
 *
 * A contract invoice is one that covers about a year — a renewal, a first
 * year, or a mid-stream conversion, whatever Stripe filed it under — or a
 * sales-led invoice, whose periods cannot be trusted. Anything else — monthly
 * cycles from before a conversion, prorations, true-ups — is real revenue but
 * not what the contract is worth.
 *
 * The newest year-spanning bill anchors the contract, and the sales-led
 * invoices raised on top of it since are read by their period: one covering a
 * real partial stretch is an upsell, added to the anchor; one with no readable
 * coverage re-bills the whole contract and replaces it. Upsells older than the
 * anchor are dropped — a renewal bakes them in. With no year-spanning bill at
 * all, the newest sales-led invoice is the contract.
 */
export function findContractInvoices<Invoice extends ContractInvoiceCandidate>(
  invoices: Invoice[],
): Invoice[] {
  const contracts = invoices.filter(isContractInvoice);

  const annualIndex = contracts.findIndex((invoice) => {
    const period = getCoveredPeriod(invoice);
    return (
      period !== null && period.end - period.start >= ANNUAL_PERIOD_SECONDS
    );
  });
  if (annualIndex === -1) {
    const newest = contracts[0];
    return newest ? [newest] : [];
  }

  const newerThanAnnual = contracts.slice(0, annualIndex);
  const replacement = newerThanAnnual.find(
    (invoice) => getCoveredPeriod(invoice) === null,
  );
  if (replacement) {
    return [replacement];
  }

  const annual = contracts[annualIndex];
  invariant(annual, "the index was just found");
  return [...newerThanAnnual, annual];
}

/**
 * One page is all a lookup reads — a hundred invoices of history is years for
 * any real customer.
 */
const INVOICES_PER_CONTRACT_LOOKUP = 100;

/**
 * The annual contracts in force, each with the invoices it is worth.
 *
 * One request per annual team rather than a year of invoices for everyone: an
 * annual contract is billed a handful of times a year at most, so its latest
 * contract invoices are what it is worth now.
 *
 * Listed by customer, not by subscription: an annual deal is not always billed
 * through the subscription the database knows. Sales-led contracts arrive as
 * dashboard or quote invoices carried by no subscription at all, and a team
 * converted to yearly mid-stream holds its contract on a `subscription_update`
 * of the old subscription — a subscription lookup misses both.
 *
 * A contract with no paid invoice may still have been billed — enterprise
 * terms run long — so the open invoices are read before concluding nothing,
 * and reported as awaiting payment. A contract with no invoice at all counts
 * nothing, which is what this reports — but it is still listed, so a contract
 * absent from the figure can be seen rather than guessed at.
 */
async function getYearlyContracts(
  teams: BilledTeam[],
): Promise<StaffYearlyContract[]> {
  const yearlyTeams = teams.filter((team) => team.interval === "year");

  const contracts = await mapWithLimit(yearlyTeams, async (team) => {
    const paid = await stripe.invoices.list({
      customer: team.stripeCustomerId,
      status: "paid",
      limit: INVOICES_PER_CONTRACT_LOOKUP,
    });
    let awaitingPayment = false;
    let found = findContractInvoices(paid.data);
    if (found.length === 0) {
      const open = await stripe.invoices.list({
        customer: team.stripeCustomerId,
        status: "open",
        limit: INVOICES_PER_CONTRACT_LOOKUP,
      });
      found = findContractInvoices(open.data);
      awaitingPayment = found.length > 0;
    }

    const invoices = found.map((invoice) => {
      const revenue = getInvoiceRevenue(invoice);
      const covered = getCoveredPeriod(invoice);
      return {
        amount: revenue.amount,
        currency: revenue.currency,
        // Stripe timestamps in whole seconds.
        invoicedAt: new Date(invoice.created * 1000),
        coveredFrom: covered ? new Date(covered.start * 1000) : null,
        coveredUntil: covered ? new Date(covered.end * 1000) : null,
      };
    });

    return {
      slug: team.slug,
      name: team.name,
      stripeSubscriptionId: team.stripeSubscriptionId,
      amount:
        invoices.length > 0
          ? invoices.reduce((sum, invoice) => sum + toEuros(invoice), 0)
          : null,
      invoices,
      awaitingPayment,
    };
  });

  // Largest first, the contracts with no invoice found last: the list reads as
  // the rate's makeup, and a contract adding nothing is the anomaly to end on.
  return contracts.sort((a, b) => {
    if (a.amount === null) {
      return b.amount === null ? 0 : 1;
    }
    if (b.amount === null) {
      return -1;
    }
    return b.amount - a.amount;
  });
}

/**
 * What the annual contracts in force are worth per month: each contract's
 * invoices over twelve, added up.
 */
function getYearlyRate(contracts: StaffYearlyContract[]): StaffRevenueSplit {
  const split = createSplit();

  for (const contract of contracts) {
    if (contract.invoices.length === 0) {
      continue;
    }
    // Invoice by invoice rather than off the summed amount, so a contract
    // partly billed in another currency keeps that part in the parity caveat.
    for (const invoice of contract.invoices) {
      addToSplit(split, {
        amount: invoice.amount / MONTHS_PER_YEAR,
        currency: invoice.currency,
      });
    }
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
  teamCustomers: Map<string, TeamCustomer>;
  /** Yearly contracts are reported as a rate, so their invoices are skipped. */
  yearlyCustomerIds: Set<string>;
}): Promise<{ split: StaffRevenueSplit; teams: StaffRevenueMonthTeam[] }> {
  const { from, to, teamCustomers, yearlyCustomerIds } = options;
  const split = createSplit();
  const byCustomer = new Map<string, StaffRevenueMonthTeam>();
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
    const team = customerId ? teamCustomers.get(customerId) : undefined;
    if (!customerId || !team) {
      continue;
    }
    if (yearlyCustomerIds.has(customerId)) {
      continue;
    }
    if (
      invoice.billing_reason === null ||
      (!SUBSCRIPTION_BILLING_REASONS.has(invoice.billing_reason) &&
        !SALES_LED_BILLING_REASONS.has(invoice.billing_reason))
    ) {
      continue;
    }

    const revenue = getInvoiceRevenue(invoice);
    // A zero invoice — a usage month under the quota, the opening of a
    // sales-created subscription — is not a team being invoiced: it would fill
    // the breakdown with empty lines and dilute the per-team average.
    if (revenue.amount === 0) {
      continue;
    }
    addToSplit(split, revenue);

    // A team invoiced twice in one month is one team, one line deeper.
    let row = byCustomer.get(customerId);
    if (!row) {
      row = {
        slug: team.slug,
        name: team.name,
        stripeCustomerId: customerId,
        amount: 0,
        currency: revenue.currency,
        revenue: 0,
      };
      byCustomer.set(customerId, row);
    }
    row.amount += revenue.amount;
    if (row.currency !== revenue.currency) {
      // Mixed currencies make the original sum meaningless; the euro figure
      // still holds.
      row.currency = null;
    }
    row.revenue += toEuros(revenue);
  }

  split.teamsCount = byCustomer.size;
  // Largest first: the breakdown is read to see who made the month.
  const teams = [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue);
  return { split, teams };
}

/** What Argos invoiced, and the annual contracts behind the yearly rate. */
export type StaffRevenue = {
  /** Oldest first, the running month last. */
  months: StaffRevenueMonth[];
  /** The contracts behind every month's `yearlyPlans`, largest first. */
  yearlyContracts: StaffYearlyContract[];
  /**
   * What GitHub Marketplace brings in a month, in euros, gross. A stated
   * constant, not a reading — see `GITHUB_MARKETPLACE_MONTHLY_USD`.
   */
  githubMarketplaceMonthlyRevenue: number;
};

/**
 * What Argos invoiced over the last `monthCount` calendar months, along with
 * the annual contracts the yearly rate is made of — one read serving both, so
 * the list always explains the figure it came with.
 *
 * Asked of Stripe on every call rather than mirrored into a table or held in a
 * cache: the invoices are the answer, they change behind us as they are paid,
 * voided and credited, and a copy of them is a second source to keep correct.
 */
export async function getStaffRevenue(
  monthCount: number,
): Promise<StaffRevenue> {
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

  const [teams, teamCustomers] = await Promise.all([
    getBilledTeams(),
    getTeamCustomers(),
  ]);
  const yearlyCustomerIds = new Set(
    teams
      .filter((team) => team.interval === "year")
      .map((team) => team.stripeCustomerId),
  );

  const reported = starts.slice(0, monthCount);
  const [yearlyContracts, totals] = await Promise.all([
    getYearlyContracts(teams),
    mapWithLimit(
      reported.map((from, index) => {
        const to = starts[index + 1];
        invariant(to, "every month reported has a bound");
        return { from, to };
      }),
      (window) => readMonth({ ...window, teamCustomers, yearlyCustomerIds }),
    ),
  ]);
  const yearlyRate = getYearlyRate(yearlyContracts);

  const months = reported.map((start, index) => {
    const month = createMonth(start);
    const total = totals[index];
    invariant(total, "every month reported has totals");
    month.monthlyPlans = total.split;
    month.teams = total.teams;
    // Copied rather than shared: one object held by every month is one object
    // a later change can mutate for all of them at once.
    month.yearlyPlans = { ...yearlyRate };
    month.revenue = total.split.revenue + yearlyRate.revenue;
    return month;
  });

  return {
    months,
    yearlyContracts,
    githubMarketplaceMonthlyRevenue: toEuros({
      amount: GITHUB_MARKETPLACE_MONTHLY_USD,
      currency: "usd",
    }),
  };
}
