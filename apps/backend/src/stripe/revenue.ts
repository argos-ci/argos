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

/** A day, under which a period is a bookkeeping point, not coverage. */
const DAY_MS = 24 * 3600 * 1000;

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

/**
 * The parts of a mirrored invoice the contract picker reads. The period is the
 * longest stretch one of the invoice's lines covered, resolved at ingest.
 */
export type ContractInvoiceCandidate = {
  billingReason: string | null;
  total: number;
  periodStart: string | null;
  periodEnd: string | null;
};

/** The stretch an invoice covers, in epoch milliseconds, or null. */
function getCoveredPeriod(
  invoice: ContractInvoiceCandidate,
): { start: number; end: number } | null {
  if (invoice.periodStart === null || invoice.periodEnd === null) {
    return null;
  }
  const start = new Date(invoice.periodStart).getTime();
  const end = new Date(invoice.periodEnd).getTime();
  // A period under a day is a bookkeeping point, not coverage.
  return end - start >= DAY_MS ? { start, end } : null;
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
    (period !== null && period.end - period.start >= ANNUAL_PERIOD_MS) ||
    (invoice.billingReason !== null &&
      SALES_LED_BILLING_REASONS.has(invoice.billingReason))
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
    return period !== null && period.end - period.start >= ANNUAL_PERIOD_MS;
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
 * The annual contracts in force, each with the invoices it is worth.
 *
 * Read by customer, not by subscription: an annual deal is not always billed
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
  if (yearlyTeams.length === 0) {
    return [];
  }

  const rows = await StripeInvoice.query()
    .whereIn(
      "stripeCustomerId",
      yearlyTeams.map((team) => team.stripeCustomerId),
    )
    .whereIn("status", ["paid", "open"])
    // A contract in force renews yearly, so its bills are at most a little
    // over a year old — two years bounds the scan without ever cutting one
    // off, where an unbounded read would drag a converted team's whole
    // monthly history along.
    .where(
      "stripeCreatedAt",
      ">=",
      startOfUTCMonth(new Date(), -24).toISOString(),
    )
    .orderBy("stripeCreatedAt", "desc");

  const byCustomer = Map.groupBy(rows, (row) => row.stripeCustomerId);

  const contracts = yearlyTeams.map((team) => {
    const all = byCustomer.get(team.stripeCustomerId) ?? [];
    let awaitingPayment = false;
    let found = findContractInvoices(
      all.filter((row) => row.status === "paid"),
    );
    if (found.length === 0) {
      found = findContractInvoices(all.filter((row) => row.status === "open"));
      awaitingPayment = found.length > 0;
    }

    const invoices = found.map((row) => {
      const revenue = getInvoiceRevenue(row);
      const covered = getCoveredPeriod(row);
      return {
        amount: revenue.amount,
        currency: revenue.currency,
        invoicedAt: new Date(row.stripeCreatedAt),
        coveredFrom: covered ? new Date(covered.start) : null,
        coveredUntil: covered ? new Date(covered.end) : null,
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
 * The stretch a contract invoice's money pays for, in epoch milliseconds.
 *
 * The stored period when it reads forward; a year from issuance otherwise —
 * either the invoice states no period at all (dashboard invoices often stamp
 * nothing usable), or it is stamped in arrears, its period ending by the day
 * it was raised, and an annual bill that claims to cover only the past is
 * collecting for the year ahead.
 */
export function getAmortizedCoverage(invoice: {
  invoicedAt: Date;
  coveredFrom: Date | null;
  coveredUntil: Date | null;
}): { start: number; end: number } {
  const issued = invoice.invoicedAt.getTime();
  if (invoice.coveredFrom && invoice.coveredUntil) {
    const start = invoice.coveredFrom.getTime();
    const end = invoice.coveredUntil.getTime();
    if (end > issued && end > start) {
      return { start, end };
    }
  }
  const yearAhead = new Date(invoice.invoicedAt);
  yearAhead.setUTCFullYear(yearAhead.getUTCFullYear() + 1);
  return { start: issued, end: yearAhead.getTime() };
}

/**
 * What the annual contracts contributed to each reported month: every
 * contract invoice amortized, day by day, over the stretch it pays for.
 *
 * The monthly equivalent of the annual book: a renewal weighs on the twelve
 * months it covers, an upsell on the stretch it was sold for, and a month's
 * figure never moves once written — where a flat rate repainted history on
 * every renewal.
 */
export function getYearlyMonthSplits(
  contracts: readonly Pick<StaffYearlyContract, "invoices">[],
  /** The reported months' first instants, oldest first. */
  monthStarts: readonly Date[],
  /** One bound past the last month, closing its window. */
  end: Date,
): StaffRevenueSplit[] {
  const splits = monthStarts.map(() => createSplit());
  const bounds = monthStarts.map((start, index) => {
    const next = monthStarts[index + 1] ?? end;
    return { start: start.getTime(), end: next.getTime() };
  });

  for (const contract of contracts) {
    const contributed = bounds.map(() => false);
    for (const invoice of contract.invoices) {
      const coverage = getAmortizedCoverage(invoice);
      const coveredDays = (coverage.end - coverage.start) / DAY_MS;
      for (const [index, bound] of bounds.entries()) {
        const overlap =
          Math.min(coverage.end, bound.end) -
          Math.max(coverage.start, bound.start);
        if (overlap <= 0) {
          continue;
        }
        const split = splits[index];
        invariant(split, "bounds and splits are built together");
        addToSplit(split, {
          amount: (invoice.amount * (overlap / DAY_MS)) / coveredDays,
          currency: invoice.currency,
        });
        contributed[index] = true;
      }
    }
    for (const [index, wasContributed] of contributed.entries()) {
      if (wasContributed) {
        const split = splits[index];
        invariant(split, "bounds and splits are built together");
        split.teamsCount += 1;
      }
    }
  }

  return splits;
}

/**
 * Read the whole window's paid invoices from the mirror and file each into its
 * calendar month — one query where the Stripe-reading version walked one
 * paginated chain per month.
 */
async function readMonths(options: {
  /** The reported months' first instants, oldest first. */
  starts: Date[];
  /** One bound past the last month, closing its window. */
  end: Date;
  /** Customers that are Argos teams — everything else is not this page's. */
  teamCustomers: Map<string, TeamCustomer>;
  /**
   * When each current annual contract's coverage began, by customer.
   *
   * A contract's invoices are reported as a rate, so from that instant on the
   * customer's invoices are skipped here — but only from then: a team that
   * converted mid-window keeps its real monthly history, instead of having it
   * erased by its present interval.
   */
  yearlyContractStarts: Map<string, number>;
}): Promise<{ split: StaffRevenueSplit; teams: StaffRevenueMonthTeam[] }[]> {
  const { starts, end, teamCustomers, yearlyContractStarts } = options;
  const first = starts[0];
  invariant(first, "at least one month is reported");

  const rows = await StripeInvoice.query()
    .where("status", "paid")
    .whereIn("billingReason", [
      ...SUBSCRIPTION_BILLING_REASONS,
      ...SALES_LED_BILLING_REASONS,
    ])
    .where("stripeCreatedAt", ">=", first.toISOString())
    .where("stripeCreatedAt", "<", end.toISOString());

  const months: {
    split: StaffRevenueSplit;
    byCustomer: Map<string, StaffRevenueMonthTeam>;
  }[] = starts.map(() => ({
    split: createSplit(),
    byCustomer: new Map<string, StaffRevenueMonthTeam>(),
  }));

  for (const row of rows) {
    const created = new Date(row.stripeCreatedAt);
    // Months are consecutive, so the index is a plain calendar distance.
    const index: number =
      (created.getUTCFullYear() - first.getUTCFullYear()) * 12 +
      (created.getUTCMonth() - first.getUTCMonth());
    const month: (typeof months)[number] | undefined = months[index];
    invariant(month, "the query bounds the rows to the window");

    const team = teamCustomers.get(row.stripeCustomerId);
    if (!team) {
      continue;
    }
    // An annual bill is never a month's revenue, whoever it belongs to now: a
    // churned yearly team's old renewal must not spike the month it landed in.
    const period = getCoveredPeriod(row);
    if (period && period.end - period.start >= ANNUAL_PERIOD_MS) {
      continue;
    }
    // From its contract's start, a yearly team's invoices — upsells,
    // true-ups — are the contract's business, reported through the rate.
    const contractStart = yearlyContractStarts.get(row.stripeCustomerId);
    if (contractStart !== undefined && created.getTime() >= contractStart) {
      continue;
    }

    const revenue = getInvoiceRevenue(row);
    // A zero invoice — a usage month under the quota, the opening of a
    // sales-created subscription — is not a team being invoiced: it would fill
    // the breakdown with empty lines and dilute the per-team average.
    if (revenue.amount === 0) {
      continue;
    }
    addToSplit(month.split, revenue);

    // A team invoiced twice in one month is one team, one line deeper.
    let teamRow = month.byCustomer.get(row.stripeCustomerId);
    if (!teamRow) {
      teamRow = {
        slug: team.slug,
        name: team.name,
        stripeCustomerId: row.stripeCustomerId,
        amount: 0,
        currency: revenue.currency,
        revenue: 0,
      };
      month.byCustomer.set(row.stripeCustomerId, teamRow);
    }
    teamRow.amount += revenue.amount;
    if (teamRow.currency !== revenue.currency) {
      // Mixed currencies make the original sum meaningless; the euro figure
      // still holds.
      teamRow.currency = null;
    }
    teamRow.revenue += toEuros(revenue);
  }

  return months.map((month) => {
    month.split.teamsCount = month.byCustomer.size;
    return {
      split: month.split,
      // Largest first: the breakdown is read to see who made the month.
      teams: [...month.byCustomer.values()].sort(
        (a, b) => b.revenue - a.revenue,
      ),
    };
  });
}

/** What Argos invoiced, and the annual contracts behind the yearly rate. */
export type StaffRevenue = {
  /** Oldest first, the running month last. */
  months: StaffRevenueMonth[];
  /** The contracts behind every month's `yearlyPlans`, largest first. */
  yearlyContracts: StaffYearlyContract[];
  /**
   * What GitHub Marketplace brings in a month, in euros, gross — the active
   * marketplace subscriptions at their plans' list prices.
   */
  githubMarketplaceMonthlyRevenue: number;
};

/**
 * What Argos invoiced over the last `monthCount` calendar months, along with
 * the annual contracts the yearly rate is made of — one read serving both, so
 * the list always explains the figure it came with.
 *
 * Read from the `stripe_invoices` mirror rather than from Stripe: the webhooks
 * keep it current and the reconciliation sweep backs them up, so a view costs
 * a few queries instead of a paginated walk of a third party.
 */
export async function getStaffRevenue(
  monthCount: number,
): Promise<StaffRevenue> {
  invariant(
    monthCount >= 1 && monthCount <= MAX_MONTHS,
    `monthCount must be between 1 and ${MAX_MONTHS}`,
  );

  const now = new Date();
  // Oldest first, the running month last; `end` closes the last window.
  const reported = Array.from({ length: monthCount }, (_, index) =>
    startOfUTCMonth(now, index - monthCount + 1),
  );
  const end = startOfUTCMonth(now, 1);
  const first = reported[0];
  invariant(first, "at least one month is reported");

  const [teams, teamCustomers, deepestSync] = await Promise.all([
    getBilledTeams(),
    getTeamCustomers(),
    StripeInvoiceSync.query().orderBy("sinceDate", "asc").first(),
  ]);

  // Told apart from a quiet stretch: months the mirror never swept would
  // report zeros that read as real figures, and the fix — a deeper
  // backfill — is on the operator.
  if (!deepestSync || new Date(deepestSync.sinceDate) > first) {
    throw new Error(
      "The Stripe invoice mirror does not cover the requested window — run stripe/bin/sync-stripe-invoices with a deeper window to backfill it.",
    );
  }

  const yearlyContracts = await getYearlyContracts(teams);

  // When each current annual contract began covering, so the months only skip
  // a yearly customer's invoices from that instant on. A contract found but
  // undatable skips everything, which is the conservative reading.
  const yearlyContractStarts = new Map<string, number>();
  for (const team of teams) {
    if (team.interval !== "year") {
      continue;
    }
    const contract = yearlyContracts.find(
      (candidate) =>
        candidate.stripeSubscriptionId === team.stripeSubscriptionId,
    );
    const covered =
      contract && contract.invoices.length > 0
        ? Math.min(
            ...contract.invoices.map(
              (invoice) => getAmortizedCoverage(invoice).start,
            ),
          )
        : Number.NEGATIVE_INFINITY;
    yearlyContractStarts.set(team.stripeCustomerId, covered);
  }

  const totals = await readMonths({
    starts: reported,
    end,
    teamCustomers,
    yearlyContractStarts,
  });
  const yearlySplits = getYearlyMonthSplits(yearlyContracts, reported, end);

  const months = reported.map((start, index) => {
    const total = totals[index];
    const yearly = yearlySplits[index];
    invariant(total && yearly, "every month reported has totals");
    return {
      month: start,
      revenue: total.split.revenue + yearly.revenue,
      monthlyPlans: total.split,
      teams: total.teams,
      yearlyPlans: yearly,
    };
  });

  return {
    months,
    yearlyContracts,
    githubMarketplaceMonthlyRevenue: await getGithubMarketplaceMonthlyRevenue(),
  };
}
