import { invariant } from "@argos/util/invariant";

import {
  Account,
  StripeInvoice,
  StripeInvoiceSync,
  Subscription,
} from "@/database/models";

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
   * What the annual contracts contributed to the month: their invoices
   * amortized, day by day, over the stretch each one pays for.
   */
  yearlyPlans: StaffRevenueSplit;
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

/**
 * What GitHub Marketplace brings in a month, in euros, gross of the 5% GitHub
 * keeps.
 *
 * The active marketplace subscriptions at their plans' list prices — GitHub
 * exposes no seller invoice API, so the listing's prices, copied onto the
 * plans by the `github-marketplace-prices` cron, are the closest thing to the
 * statement. Zero until that cron (or its bin form) has priced the plans.
 */
async function getGithubMarketplaceMonthlyRevenue(): Promise<number> {
  const rows = (await Subscription.query()
    .select("subscriptions.accountId", "plan.githubMonthlyPriceCents")
    .joinRelated("plan")
    .where("subscriptions.provider", "github")
    .whereNotNull("plan.githubMonthlyPriceCents")
    .whereRaw("?? < now()", "subscriptions.startDate")
    .whereIn("subscriptions.status", ["active", "past_due"])
    .where((query) =>
      query
        .whereNull("subscriptions.endDate")
        .orWhereRaw("?? >= now()", "subscriptions.endDate"),
    )
    .distinctOn("subscriptions.accountId")
    .orderBy("subscriptions.accountId")
    .orderBy("plan.githubMonthlyPriceCents", "DESC")) as unknown as {
    githubMonthlyPriceCents: number;
  }[];

  const cents = rows.reduce((sum, row) => sum + row.githubMonthlyPriceCents, 0);
  return toEuros({ amount: cents / 100, currency: "usd" });
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
  /** True when every invoice found is still awaiting payment. */
  awaitingPayment: boolean;
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

  const isSalesLed =
    invoice.billingReason !== null &&
    SALES_LED_BILLING_REASONS.has(invoice.billingReason);
  if (isSalesLed) {
    if (!period) {
      return options.customerHasTerm
        ? { kind: "contract", coverage: yearFrom(issued) }
        : { kind: "monthly" };
    }
    // Sold as a block rather than billed for a month — an upsell covering the
    // stretch from its sale to the term's renewal date.
    if (period.end - period.start > MONTHLY_PERIOD_MS) {
      return {
        kind: "contract",
        coverage: period.end > issued ? period : yearFrom(issued),
      };
    }
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

/** What Argos invoiced, and the annual contracts behind the yearly figures. */
export type StaffRevenue = {
  /** Oldest first, the running month last. */
  months: StaffRevenueMonth[];
  /** The contracts behind the yearly figures, largest first. */
  yearlyContracts: StaffYearlyContract[];
  /**
   * What GitHub Marketplace brings in a month, in euros, gross — the active
   * marketplace subscriptions at their plans' list prices.
   */
  githubMarketplaceMonthlyRevenue: number;
};

/** Raised by the reader when the mirror cannot answer for the window asked. */
export class MirrorCoverageError extends Error {}

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

  const [teamCustomers, billedTeams, deepestSync, freshestSync, marketplace] =
    await Promise.all([
      getTeamCustomers(),
      getBilledTeams(),
      StripeInvoiceSync.query().orderBy("sinceDate", "asc").first(),
      StripeInvoiceSync.query().orderBy("completedAt", "desc").first(),
      getGithubMarketplaceMonthlyRevenue(),
    ]);

  // Two things have to hold before a figure can be trusted: the mirror was
  // swept deep enough to hold the contracts that pay for the window, and it
  // has been swept recently enough that what it holds is still current. A
  // mirror failing either reports zeros that read as figures.
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

  const rows = await StripeInvoice.query()
    .whereIn("status", COUNTED_STATUSES)
    .whereIn("billingReason", [
      ...SUBSCRIPTION_BILLING_REASONS,
      ...SALES_LED_BILLING_REASONS,
    ])
    .where("stripeCreatedAt", ">=", scanStart.toISOString())
    .where("stripeCreatedAt", "<", end.toISOString());

  const customersWithTerms = getCustomersWithTerms(rows);

  // The months, and the contracts, from the same read.
  const monthSplits = reported.map(() => createSplit());
  const monthTeams = reported.map(
    () => new Map<string, StaffRevenueMonthTeam>(),
  );
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
    // A zero invoice — a usage month under the quota, the opening of a
    // sales-created subscription — is not a team being invoiced.
    if (revenue.amount === 0) {
      continue;
    }

    const classified = classifyInvoice(row, {
      customerHasTerm: customersWithTerms.has(row.stripeCustomerId),
    });
    if (classified.kind === "contract") {
      contractReads.push({
        row,
        revenue,
        coverage: classified.coverage,
        isFullTerm:
          classified.coverage.end - classified.coverage.start >=
          ANNUAL_PERIOD_MS,
      });
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
    const teams = monthTeams[index];
    if (!split || !teams) {
      continue;
    }
    addToSplit(split, revenue);

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
  }

  // Contracts, once their terms no longer overlap: spread each one over the
  // months its money pays for, and remember what each contributes to the
  // running month for the table to report.
  const contracts = clipContractTerms(contractReads);
  const runningIndex = reported.length - 1;
  const runningMonth = monthBounds[runningIndex];
  invariant(runningMonth, "the running month is one of the reported ones");
  const monthlyByCustomer = new Map<string, number>();

  for (const contract of contracts) {
    const coveredMs = contract.coverage.end - contract.coverage.start;
    if (coveredMs <= 0) {
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
      monthlyByCustomer.set(
        contract.row.stripeCustomerId,
        (monthlyByCustomer.get(contract.row.stripeCustomerId) ?? 0) +
          toEuros({
            amount: (contract.revenue.amount * monthOverlap) / coveredMs,
            currency: contract.revenue.currency,
          }),
      );
    }
  }

  for (const [index, split] of yearlySplits.entries()) {
    split.teamsCount = yearlyMonthCustomers[index]?.size ?? 0;
  }

  const months = reported.map((start, index) => {
    const monthly = monthSplits[index];
    const yearly = yearlySplits[index];
    const teams = monthTeams[index];
    invariant(monthly && yearly && teams, "every month reported has totals");
    monthly.teamsCount = teams.size;
    return {
      month: start,
      revenue: monthly.revenue + yearly.revenue,
      monthlyPlans: monthly,
      // Largest first: the breakdown is read to see who made the month.
      teams: [...teams.values()].sort((a, b) => b.revenue - a.revenue),
      yearlyPlans: yearly,
    };
  });

  return {
    months,
    yearlyContracts: buildYearlyContracts({
      contracts,
      teamCustomers,
      billedTeams,
      monthlyByCustomer,
      runningMonth,
    }),
    githubMarketplaceMonthlyRevenue: marketplace,
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
  runningMonth: { start: number; end: number };
}): StaffYearlyContract[] {
  const {
    contracts,
    teamCustomers,
    billedTeams,
    monthlyByCustomer,
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
      awaitingPayment: invoices.every((invoice) => invoice.awaitingPayment),
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
