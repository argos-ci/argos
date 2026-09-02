import { useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Button, ButtonIcon } from "@/ui/Button";
import { ChartCard } from "@/ui/ChartCard";
import type { ChartConfig } from "@/ui/Charts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/ui/Charts";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { Loader } from "@/ui/Loader";
import { SortHeader, type SortDirection } from "@/ui/SortHeader";
import { StatTile } from "@/ui/StatTile";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { PRO_MONTHLY_PRICE, PRO_PLAN_NAME } from "./pricing";
import { StripeCustomerLink } from "./stripe";

/**
 * Read from the backend's Stripe invoice mirror — this page is the query's
 * only consumer, asking for a year plus the running month.
 */
const StaffRevenueQuery = graphql(`
  query StaffRevenue_staffRevenue($months: Int!) {
    staffRevenue(months: $months) {
      months {
        month
        revenue
        monthlyPlans {
          revenue
          teamsCount
          foreignRevenue
        }
        yearlyPlans {
          revenue
          teamsCount
          foreignRevenue
        }
        githubPlans {
          revenue
          teamsCount
          foreignRevenue
        }
      }
      projection {
        revenue
        monthlyPlans
        yearlyPlans
        githubPlans
        estimated
      }
      yearlyContracts {
        slug
        name
        stripeCustomerId
        amount
        monthlyRevenue
        awaitingPayment
        invoices {
          amount
          currency
          invoicedAt
          coveredFrom
          coveredUntil
          awaitingPayment
        }
        usage {
          periodFrom
          periodEndsAt
          screenshotsCount
          includedScreenshots
          additionalCost
          additionalPrice {
            amount
            currency
          }
          monthlyAdditionalCost
          projectedScreenshotsCount
          projectedAdditionalCost
        }
      }
    }
  }
`);

/**
 * The teams behind one month, read when a reader opens that month rather than
 * beside the figures: a line carries the usage its team got through, and a
 * year of that is the page's whole cost. Closed months never change, so the
 * Apollo cache holds each one for the session after its first opening.
 */
const StaffRevenueMonthTeamsQuery = graphql(`
  query StaffRevenue_staffRevenueMonthTeams($month: DateTime!) {
    staffRevenueMonthTeams(month: $month) {
      slug
      name
      stripeCustomerId
      amount
      currency
      revenue
      screenshotsCount
      estimatedAt
      planPrice {
        amount
        currency
      }
      includedScreenshots
      planName
      invoices {
        amount
        currency
        invoicedAt
      }
    }
  }
`);

type RevenueData = DocumentType<typeof StaffRevenueQuery>["staffRevenue"];
type RevenueMonth = RevenueData["months"][number];
type RevenueProjection = RevenueData["projection"];
type YearlyContract = RevenueData["yearlyContracts"][number];
type ContractUsage = NonNullable<YearlyContract["usage"]>;
type Split = RevenueMonth["monthlyPlans"];
type MonthTeam = DocumentType<
  typeof StaffRevenueMonthTeamsQuery
>["staffRevenueMonthTeams"][number];

/** Months the dedicated page reads — a year, plus the one running. */
const PAGE_MONTHS = 13;

/**
 * How each half is arrived at, one tooltip each.
 *
 * Two rather than one because the halves do not answer the same question: the
 * monthly one reports the month's invoices, the yearly one a rate.
 */
const LAST_MONTHLY_HINT = "Last month's invoices, ex-tax, net of credit notes.";

const CURRENT_MONTHLY_HINT =
  "This month's invoices so far, ex-tax, net of credit notes.";

const YEARLY_HINT =
  "Annual contracts amortized, day by day, over the months they cover, with the overage their terms have run up. In €.";

const GITHUB_HINT =
  "The month's Marketplace subscriptions at list price, billed by GitHub rather than invoiced by Argos.";

/**
 * Stands in for the hint line while the figures load.
 *
 * `StatTile` only reserves that line's height when it is given a hint at all,
 * and blanks its content on its own while loading. Handing it nothing until the
 * data lands drops the line entirely, so the card grows under the reader the
 * moment it arrives.
 */
const HINT_PLACEHOLDER = " ";

const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_SHORT_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

/**
 * The locale every figure on this page is written in.
 *
 * Pinned rather than left to the reader, like the currency below and for the
 * same reason: the book is kept in euros by a team that reads them in French,
 * and a page whose numbers changed shape from one staff screen to the next
 * would be quoted back and forth in two notations.
 */
const PAGE_LOCALE = "fr-FR";

/**
 * Every amount on this page is in euros — the currency the business is run
 * in — where the other staff pages price plans in dollars. Dollar invoices are
 * converted server-side at a fixed rate, which the foreign-share caveats own.
 */
const EUR_PRICE_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatEuros(amount: number): string {
  return EUR_PRICE_FORMAT.format(amount);
}

/** Amounts on the axis, shortened, in the page's euros. */
const AXIS_PRICE_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 0,
});

/**
 * Amounts in the contracts table.
 *
 * Rounded to the euro like the rest of the page, so the table's own total can
 * come out a euro or two off the rows above it: a twelfth of a contract falls
 * between two of them, and the cents that would make the column add up exactly
 * are noise on every figure that carries them.
 */
const CONTRACT_PRICE_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * An invoice in the currency it was raised in — the audit trail to Stripe.
 *
 * Local formatters rather than util/intl's `formatCurrency`: that one follows
 * the reader's locale, where every figure on this page is pinned to one so the
 * amounts read the same on every staff screen. Rounded to the unit like
 * every other amount here: this page is read for what a month came to, and
 * the cents belong to the invoice in Stripe, one click away.
 */
const INVOICE_PRICE_FORMATS = new Map<string, Intl.NumberFormat>();
function formatInvoiceAmount(invoice: {
  amount: number;
  currency: string;
}): string {
  const currency = invoice.currency.toUpperCase();
  let format = INVOICE_PRICE_FORMATS.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(PAGE_LOCALE, {
      style: "currency",
      currency,
      // `$` rather than `$US`: the column is read for the currency an invoice
      // was raised in, and the two this page ever sees are told apart by their
      // symbols alone.
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
    INVOICE_PRICE_FORMATS.set(currency, format);
  }
  return format.format(invoice.amount);
}

/** Screenshot counts, grouped like the team directory prints them. */
const SCREENSHOTS_FORMAT = new Intl.NumberFormat(PAGE_LOCALE);

/** A month's move against the one before it, signed. */
const GROWTH_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

/** A renewal's date, read in UTC like every other date on the page. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** How much of a term has gone by — what a projection off it is worth. */
const SHARE_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});

/**
 * The figures a projection is stated in, rounded to the hundred and the
 * thousand.
 *
 * A trend carried in a straight line does not know its own last two digits,
 * and a euro-exact figure invites being quoted back as one. Rounded where it
 * is written rather than where it is computed, so the arithmetic behind it
 * stays exact and only the reading is coarse.
 */
function roundProjectedEuros(amount: number): number {
  return Math.round(amount / 100) * 100;
}

/**
 * Signed, both of them: what this column states is not what a contract comes
 * to but what it runs up on top of it, and the sign is what says so on the
 * figure as well as on the volume under it. `Intl` places it, so a locale that
 * writes its signs elsewhere still reads right.
 */
const PROJECTED_PRICE_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

function formatProjectedEuros(amount: number): string {
  return PROJECTED_PRICE_FORMAT.format(roundProjectedEuros(amount));
}

function formatProjectedScreenshots(count: number): string {
  return SCREENSHOTS_FORMAT.format(Math.round(count / 1000) * 1000);
}

/**
 * The same count as a column prints it, shortened.
 *
 * Millions of screenshots written out set the width of the column they sit in
 * and read as a precision a straight line does not have. Grouped in full in the
 * tooltip, where a figure to quote belongs.
 */
const COMPACT_SCREENSHOTS_FORMAT = new Intl.NumberFormat(PAGE_LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
  signDisplay: "always",
});

/** The figures behind a half, appended to its tooltip. */
function getSplitNote(split: Split): string {
  const teams = ` ${split.teamsCount} ${split.teamsCount === 1 ? "team" : "teams"}.`;
  // Named only when there is some: on an all-euro month the caveat would be
  // noise, and on a month with dollars in it the reader has to know part of
  // the total went through the fixed rate.
  const foreign =
    split.foreignRevenue > 0
      ? ` ${formatEuros(split.foreignRevenue)} of it was invoiced in dollars, converted at a fixed rate.`
      : "";

  return `${teams}${foreign}`;
}

/**
 * How the figure moved between two months, or null when there is nothing to
 * divide by.
 *
 * A month that invoiced nothing is a real answer, but it makes no ratio, and
 * reporting the growth as infinite would say less than saying nothing.
 */
function getGrowth(month: number, before: number): number | null {
  return before === 0 ? null : (month - before) / before;
}

/** A term with its explanation on hover — the page's one affordance for it. */
function Hint(props: {
  content: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={props.content}>
      <span
        className={clsx(
          "underline decoration-dotted underline-offset-2",
          props.className,
        )}
      >
        {props.children}
      </span>
    </Tooltip>
  );
}

/** One half of the amount, with the tooltip that explains that half alone. */
function SplitAmount(props: {
  amount: number;
  label: string;
  tooltip: string;
}) {
  return (
    <Hint content={props.tooltip}>
      {formatEuros(props.amount)} {props.label}
    </Hint>
  );
}

/**
 * Where a month's amount comes from, under the amount.
 *
 * The two intervals rather than any other cut: they are the two things this
 * computes differently — one reads the month's invoices, the other spreads a
 * year's — so they are what a reader has to be able to take apart.
 */
function MonthSplit(props: { month: RevenueMonth; monthlyHint: string }) {
  const { month, monthlyHint } = props;

  return (
    <>
      <SplitAmount
        amount={month.monthlyPlans.revenue}
        label="Monthly"
        tooltip={`${monthlyHint}${getSplitNote(month.monthlyPlans)}`}
      />
      {" · "}
      <SplitAmount
        amount={month.yearlyPlans.revenue}
        label="Yearly"
        tooltip={`${YEARLY_HINT}${getSplitNote(month.yearlyPlans)}`}
      />
      {month.githubPlans.revenue > 0 ? (
        <>
          {" · "}
          <SplitAmount
            amount={month.githubPlans.revenue}
            label="GitHub"
            tooltip={`${GITHUB_HINT}${getSplitNote(month.githubPlans)}`}
          />
        </>
      ) : null}
    </>
  );
}

/**
 * Where the running month's projection comes from, under the amount.
 *
 * The same three parts the months above are split into, so the card can be
 * read against the one beside it — and the part of the monthly figure no
 * invoice exists for, which is the only one of the three that is not a
 * reading of something already raised.
 */
function ProjectionSplit(props: { projection: RevenueProjection }) {
  const { projection } = props;

  return (
    <>
      <SplitAmount
        amount={projection.monthlyPlans}
        label="Monthly"
        tooltip={`This month's invoices, plus ${formatEuros(projection.estimated)} the cycles have not raised yet — what the subscriptions still to be billed have run up so far. A floor: their usage keeps accruing until the cycle closes.`}
      />
      {" · "}
      <SplitAmount
        amount={projection.yearlyPlans}
        label="Yearly"
        tooltip="A whole month of the annual contracts and their overage, where the card beside this one counts only the days that have gone by."
      />
      {projection.githubPlans > 0 ? (
        <>
          {" · "}
          <SplitAmount
            amount={projection.githubPlans}
            label="GitHub"
            tooltip="A whole month of the Marketplace subscriptions, at list price, billed by GitHub rather than invoiced by Argos."
          />
        </>
      ) : null}
    </>
  );
}

/** The three headline figures, rendered from whatever window was read. */
function RevenueCards(props: {
  /** Oldest first, the running month last. Null while loading. */
  months: readonly RevenueMonth[] | null;
  /** Where the running month is heading. Null while loading. */
  projection: RevenueProjection | null;
  error: Error | null;
}) {
  const { months, projection, error } = props;

  // The last two are the only ones the cards read, whatever the window.
  const currentMonth = months?.at(-1) ?? null;
  const lastMonth = months?.at(-2) ?? null;

  // An em dash on all three rather than a band that disappears: the figures
  // failing to load is worth seeing on a page whose whole subject is what they
  // report.
  //
  // The reason is carried rather than swallowed: the realistic failures — the
  // invoice mirror not backfilled deep enough for the window, a database
  // error — are exactly the ones whose message tells the operator what to do,
  // and this page is staff-only, so there is nobody here to protect from the
  // detail.
  const unavailable = error ? (
    <Hint content={error.message}>unavailable</Hint>
  ) : null;

  /** `undefined` draws the skeleton, `null` an em dash. */
  const readValue = (value: number | null) => {
    if (error) {
      return null;
    }
    return months ? value : undefined;
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile
        data-visual-test="transparent"
        icon={CalendarCheckIcon}
        color="primary"
        label="Last month revenue"
        value={readValue(lastMonth?.revenue ?? null)}
        format="currency"
        currency="EUR"
        locales={PAGE_LOCALE}
        hint={
          unavailable ??
          (lastMonth ? (
            <MonthSplit month={lastMonth} monthlyHint={LAST_MONTHLY_HINT} />
          ) : (
            HINT_PLACEHOLDER
          ))
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={CalendarClockIcon}
        // The storybook token is the design system's pink.
        color="storybook"
        label="Invoiced this month"
        value={readValue(currentMonth?.revenue ?? null)}
        format="currency"
        currency="EUR"
        locales={PAGE_LOCALE}
        hint={
          unavailable ??
          (currentMonth ? (
            <MonthSplit
              month={currentMonth}
              monthlyHint={CURRENT_MONTHLY_HINT}
            />
          ) : (
            HINT_PLACEHOLDER
          ))
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={TrendingUpIcon}
        color="success"
        label="Projected this month"
        value={readValue(projection?.revenue ?? null)}
        format="currency"
        currency="EUR"
        locales={PAGE_LOCALE}
        hint={
          unavailable ??
          (projection ? (
            <ProjectionSplit projection={projection} />
          ) : (
            HINT_PLACEHOLDER
          ))
        }
      />
    </div>
  );
}

/**
 * The series, in a fixed order with fixed colours: the monthly book keeps its
 * colour whether it is the larger half or not, so a month where the halves
 * cross over does not repaint the chart. Pink for the monthly book, violet —
 * the app's accent — for the annual one, grass for the Marketplace rate.
 */
const CHART_SERIES = [
  { key: "monthly", label: "Monthly plans", color: "var(--pink-9)" },
  { key: "yearly", label: "Yearly plans", color: "var(--violet-9)" },
  { key: "github", label: "GitHub Marketplace", color: "var(--grass-9)" },
] as const;

const CHART_CONFIG: ChartConfig = Object.fromEntries(
  CHART_SERIES.map((series) => [
    series.key,
    { label: series.label, color: series.color },
  ]),
);

/**
 * The window as stacked areas, one point per month, the running one included.
 *
 * Stacked because the bands compose the business's total, so the height is
 * the figure and its split is where it came from. Areas rather than bars
 * because what is being read here is a trend over a year, and a filled band
 * carries a slope where twelve separate bars make the reader measure heights
 * against each other.
 *
 * The tooltip totals the three bands, the stack's own height — the same figure
 * the cards state, Marketplace included: what a month was worth is what it was
 * worth, whoever raised the bill.
 */
function RevenueChart(props: { months: readonly RevenueMonth[] }) {
  const data = props.months.map((month) => ({
    month: month.month,
    monthly: month.monthlyPlans.revenue,
    yearly: month.yearlyPlans.revenue,
    github: month.githubPlans.revenue,
  }));

  return (
    <ChartContainer
      config={CHART_CONFIG}
      className="h-full w-full"
      data-visual-test="transparent"
    >
      <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
        <defs>
          {CHART_SERIES.map((series) => (
            <linearGradient
              key={series.key}
              id={`fill-${series.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={series.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={series.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {/* Horizontal only, dashed: the grid is there to read a height against,
            not to be looked at. */}
        <CartesianGrid vertical={false} strokeDasharray="5 5" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tickFormatter={(value: string) =>
            MONTH_SHORT_FORMAT.format(new Date(value))
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          // Wide enough for the longest compact amount. Left to itself under a
          // negative margin, the axis cropped its own labels and printed
          // "8 k $US" where it meant "$38K".
          width={56}
          tickFormatter={(value: number) => AXIS_PRICE_FORMAT.format(value)}
        />
        <ChartTooltip
          isAnimationActive={false}
          content={
            <ChartTooltipContent
              // The month is read off the datum rather than off the label:
              // Recharts hands the label over as a node, not as the value.
              labelFormatter={(_label, payload) => {
                const item = payload[0];
                invariant(item, "a tooltip always has a datum");
                return MONTH_YEAR_FORMAT.format(new Date(item.payload.month));
              }}
              valueFormatter={(value) => formatEuros(value)}
            />
          }
        />
        {/* Two series, so a legend is not optional: identity must not rest on
            colour alone. */}
        <ChartLegend content={<ChartLegendContent />} />
        {CHART_SERIES.map((series) => (
          <Area
            key={series.key}
            dataKey={series.key}
            type="monotone"
            stackId="revenue"
            fill={`url(#fill-${series.key})`}
            stroke={series.color}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

type MonthTeamSortKey =
  | "team"
  | "usage"
  | "plan"
  | "amount"
  | "revenue"
  | "date";

/**
 * Sortable value per column of a month's breakdown.
 *
 * `amount` orders on the figure the column prints rather than on its euro
 * equivalent: the two only diverge across currencies, and a reader comparing
 * the numbers in front of them is comparing those. The euro column is what
 * orders the month by weight. A team invoiced in several currencies has no
 * printable figure at all, so it sorts below every one that has.
 */
function getMonthTeamSortValue(
  team: MonthTeam,
  key: MonthTeamSortKey,
): string | number {
  switch (key) {
    case "team":
      return (team.name ?? team.slug).toLowerCase();
    case "amount":
      return team.currency === null ? -1 : team.amount;
    case "revenue":
      return team.revenue;
    case "plan":
      return team.planPrice?.amount ?? -1;
    case "usage":
      return team.screenshotsCount;
    case "date": {
      // On the date the column prints: the newest invoice, or the day the bill
      // is expected on a line that has none yet.
      const date = getMonthTeamDate(team);
      return date ? date.getTime() : -1;
    }
  }
}

/**
 * The day a line is filed under: when its newest invoice was raised, or when
 * the bill it is still waiting on is expected.
 */
function getMonthTeamDate(team: MonthTeam): Date | null {
  const newest = team.invoices[0];
  if (newest) {
    return new Date(newest.invoicedAt);
  }
  return team.estimatedAt ? new Date(team.estimatedAt) : null;
}

function sortMonthTeams(
  teams: readonly MonthTeam[],
  key: MonthTeamSortKey,
  direction: SortDirection,
): MonthTeam[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...teams].sort((a, b) => {
    const left = getMonthTeamSortValue(a, key);
    const right = getMonthTeamSortValue(b, key);

    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right) * factor;
    }

    return (Number(left) - Number(right)) * factor;
  });
}

/**
 * The teams behind a month's monthly plans, one line each.
 *
 * Sorted newest invoice first to open, so the month reads as a ledger; teams
 * invoiced the same day keep the heaviest-first order the backend sends, the
 * sort being stable. The rank column numbers the rows as they are displayed,
 * so it re-reads as a line number under any other sort rather than pinning a
 * position the sort has moved.
 *
 * The running month also carries the bills it is still waiting on — a cycle
 * that falls later in the month has raised nothing yet — as estimated lines.
 * Their date is the day the bill is expected, so that order puts them at the
 * top: they are the only lines of the month that have not happened.
 */
function MonthTeamsTable(props: { teams: readonly MonthTeam[] }) {
  const [sortKey, setSortKey] = useState<MonthTeamSortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const onSort = (key: MonthTeamSortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    // Names read best A→Z; the money columns are read biggest-first.
    setSortDirection(key === "team" ? "asc" : "desc");
  };

  const teams = useMemo(
    () => sortMonthTeams(props.teams, sortKey, sortDirection),
    [props.teams, sortKey, sortDirection],
  );

  return (
    <div className="bg-app overflow-x-auto rounded-sm border">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="text-low border-b text-xs font-semibold">
            <th className="w-[5%] px-4 py-3 text-right">#</th>
            <SortHeader
              label="Team"
              sortKey="team"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[20%] text-left"
            />
            <SortHeader
              label="Plan"
              sortKey="plan"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[14%] text-right"
            />
            <SortHeader
              label="Invoiced"
              sortKey="amount"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[16%] text-right"
            />
            <SortHeader
              label="In euros"
              sortKey="revenue"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[14%] text-right"
            />
            <SortHeader
              label="Usage"
              sortKey="usage"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[16%] text-right"
            />
            <SortHeader
              label="Date"
              sortKey="date"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="w-[15%] text-right"
            />
          </tr>
        </thead>
        <tbody>
          {teams.map((team, teamIndex) => {
            const newestInvoice = team.invoices[0] ?? null;
            const expectedAt = team.estimatedAt
              ? new Date(team.estimatedAt)
              : null;
            // Pro at list is what nearly every line is billed, so printing it
            // would repeat one figure down the column. An amount that is not
            // it — a commitment, or a price negotiated off the list — is the
            // only one worth reading.
            const planPrice =
              team.planPrice &&
              team.planName === PRO_PLAN_NAME &&
              team.planPrice.amount === PRO_MONTHLY_PRICE
                ? null
                : team.planPrice;
            // Under the count it is read against, and left out on Pro, whose
            // quota is the same figure down nearly every line — the team
            // directory prints it on the same terms.
            const quota =
              team.includedScreenshots !== null &&
              team.planName !== PRO_PLAN_NAME
                ? SCREENSHOTS_FORMAT.format(team.includedScreenshots)
                : null;

            return (
              <tr
                // The customer alone is not unique: a team sent a bill this
                // month can still have its cycle's own bill to come, which is
                // a second line — one invoiced, one estimated.
                key={`${team.stripeCustomerId}-${team.estimatedAt ? "estimate" : "invoiced"}`}
                className={clsx(
                  "text-sm",
                  teamIndex !== teams.length - 1 && "border-b",
                  // A bill that has not been raised is written in grey, so a
                  // ledger of facts is not read off the same colour as one
                  // line that is a projection.
                  expectedAt && "text-low",
                )}
              >
                <td className="text-low px-4 py-2.5 text-right tabular-nums">
                  {teamIndex + 1}
                </td>
                <td className="px-4 py-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <Link href={`/${team.slug}`}>{team.name ?? team.slug}</Link>
                    <StripeCustomerLink
                      stripeCustomerId={team.stripeCustomerId}
                    />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {planPrice ? formatInvoiceAmount(planPrice) : null}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {team.currency === null ? (
                    <span className="text-low">—</span>
                  ) : expectedAt ? (
                    // The grey the row is written in says the amount was not
                    // invoiced; what it is made of takes a sentence, so it is
                    // the tooltip that carries it.
                    <Hint content="Not yet invoiced or included above">
                      {formatInvoiceAmount({
                        amount: team.amount,
                        currency: team.currency,
                      })}
                    </Hint>
                  ) : (
                    formatInvoiceAmount({
                      amount: team.amount,
                      currency: team.currency,
                    })
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatEuros(team.revenue)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {expectedAt ? (
                    // The period's, not the month's: it is the count the
                    // estimate beside it was computed on.
                    <Hint content="To date">
                      {SCREENSHOTS_FORMAT.format(team.screenshotsCount)}
                    </Hint>
                  ) : (
                    SCREENSHOTS_FORMAT.format(team.screenshotsCount)
                  )}
                  {quota !== null && (
                    <div className="text-low text-xs">/ {quota}</div>
                  )}
                </td>
                {/* The dates walk forward with the calendar, like the month
                    names above. */}
                <td
                  className="px-4 py-2.5 text-right tabular-nums"
                  data-visual-test="transparent"
                >
                  {expectedAt ? (
                    DATE_FORMAT.format(expectedAt)
                  ) : newestInvoice === null ? (
                    <span className="text-low">—</span>
                  ) : team.invoices.length === 1 ? (
                    DATE_FORMAT.format(new Date(newestInvoice.invoicedAt))
                  ) : (
                    // A team invoiced twice in one month is one line, so the
                    // column carries the newest date and the tooltip the rest.
                    <Hint
                      content={
                        <div className="flex flex-col gap-1">
                          {team.invoices.map((invoice, invoiceIndex) => (
                            <div key={invoiceIndex}>
                              {formatInvoiceAmount(invoice)} invoiced{" "}
                              {DATE_FORMAT.format(new Date(invoice.invoicedAt))}
                              .
                            </div>
                          ))}
                        </div>
                      }
                    >
                      {DATE_FORMAT.format(new Date(newestInvoice.invoicedAt))}
                    </Hint>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Month over month down the history, so a trend can be read off the column. */
function HistoryRow(props: {
  month: RevenueMonth;
  before: RevenueMonth | null;
  /** The month still running — partial, so it makes no comparison. */
  isCurrent: boolean;
  index: number;
  isLast: boolean;
}) {
  const { month, before, isCurrent, index, isLast } = props;
  const [isOpened, setIsOpened] = useState(false);
  // A month nobody invoiced has nothing to open, and the running month can
  // still be owed a bill nothing has counted — so it opens whatever its
  // figures say.
  const hasTeams = isCurrent || month.monthlyPlans.teamsCount > 0;
  // Fired on the first opening and never again: a closed month's breakdown is
  // a fact, and Apollo holds it for the session.
  const { data, error } = useQuery(StaffRevenueMonthTeamsQuery, {
    variables: { month: month.month },
    skip: !isOpened,
  });
  const teams = data?.staffRevenueMonthTeams ?? null;
  // On the monthly figure, like every column here: the yearly rate lives in
  // its own table, and a change diluted by a flat rate would understate every
  // move.
  const growth =
    before && !isCurrent
      ? getGrowth(month.monthlyPlans.revenue, before.monthlyPlans.revenue)
      : null;
  // Rounded before it is read, so a move too small to print cannot come out
  // coloured one way and signed another: a fifth of a percent down rounds to
  // a flat 0%, where the raw figure would have painted that zero red. The
  // `|| 0` is what turns `Math.round`'s negative zero back into a zero.
  const percent = growth === null ? null : Math.round(growth * 100) || 0;

  return (
    <>
      <tr
        className={clsx(
          index % 2 === 0 ? "bg-app" : "bg-subtle",
          (!isLast || isOpened) && "border-b",
        )}
      >
        {/* The month names walk forward with the calendar, so a visual
            baseline of this table would need approving every month. */}
        <td
          className="p-4 text-left text-sm font-medium"
          data-visual-test="transparent"
        >
          {MONTH_YEAR_FORMAT.format(new Date(month.month))}
          {isCurrent ? <span className="text-low"> (running)</span> : null}
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {formatEuros(month.monthlyPlans.revenue)}
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {percent === null ? (
            <span className="text-low">—</span>
          ) : (
            <span
              className={percent < 0 ? "text-danger-low" : "text-success-low"}
            >
              {GROWTH_FORMAT.format(percent / 100)}
            </span>
          )}
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {month.monthlyPlans.teamsCount}
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {month.monthlyPlans.teamsCount > 0 ? (
            formatEuros(
              month.monthlyPlans.revenue / month.monthlyPlans.teamsCount,
            )
          ) : (
            <span className="text-low">—</span>
          )}
        </td>
        <td className="p-4 text-right text-sm">
          {hasTeams ? (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setIsOpened((opened) => !opened)}
            >
              View details
              <ButtonIcon position="right">
                <ChevronDownIcon
                  className={clsx(
                    "transition-transform",
                    isOpened && "rotate-180",
                  )}
                />
              </ButtonIcon>
            </Button>
          ) : null}
        </td>
      </tr>
      {isOpened ? (
        <tr
          className={clsx(
            // Inverted from the month's row, like the team directory's detail
            // rows: the breakdown reads as inside the month, not as a sibling.
            index % 2 === 0 ? "bg-subtle" : "bg-app",
            !isLast && "border-b",
          )}
        >
          <td colSpan={6} className="p-4">
            {teams ? (
              <MonthTeamsTable teams={teams} />
            ) : error ? (
              <Alert>
                <AlertText>{error.message}</AlertText>
              </Alert>
            ) : (
              <div className="flex justify-center py-4">
                <Loader className="text-low size-6" />
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

/**
 * The window, month by month.
 *
 * The reason this page exists rather than the band alone: three cards say where
 * revenue stands, a column says which way it has been going — and the months
 * are already read to draw the cards, so the table costs nothing more.
 *
 * Newest first, like every other staff table: the rows people read are the
 * recent ones.
 */
function RevenueHistory(props: { months: readonly RevenueMonth[] }) {
  const { months } = props;
  const rows = [...months].reverse();

  return (
    <div>
      <div className="mb-3">
        <h3 className="font-semibold">Monthly plans</h3>
      </div>
      <div className="overflow-x-auto rounded-sm border">
        <table className="w-full min-w-160 table-fixed border-collapse">
          <thead>
            <tr className="text-low border-b text-xs font-semibold">
              <th className="w-[16%] px-4 py-3 text-left">Month</th>
              <th className="w-[18%] px-4 py-3 text-right">
                <Hint content="Ex-tax, net of credit notes.">Invoiced</Hint>
              </th>
              <th className="w-[14%] px-4 py-3 text-right">Change</th>
              <th className="w-[14%] px-4 py-3 text-right">Teams</th>
              <th className="w-[18%] px-4 py-3 text-right">
                <Hint content="Monthly revenue per paying team.">ARPU</Hint>
              </th>
              <th className="w-[20%] px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((month, index) => (
              <HistoryRow
                key={month.month}
                month={month}
                // `rows` runs newest first, so the month before is the next one.
                before={rows[index + 1] ?? null}
                // The newest row is the month still running.
                isCurrent={index === 0}
                index={index}
                isLast={index === rows.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One counted invoice, described for the amount's breakdown tooltip. */
function describeInvoice(invoice: YearlyContract["invoices"][number]): string {
  return `${formatInvoiceAmount(invoice)} invoiced ${DATE_FORMAT.format(new Date(invoice.invoicedAt))}, covers ${DATE_FORMAT.format(new Date(invoice.coveredFrom))} to ${DATE_FORMAT.format(new Date(invoice.coveredUntil))}.`;
}

/** The contract's invoices in their own currency, when they share one. */
function getOriginalTotal(
  contract: YearlyContract,
): { amount: number; currency: string } | null {
  const first = contract.invoices[0];
  if (
    !first ||
    contract.invoices.some((invoice) => invoice.currency !== first.currency)
  ) {
    return null;
  }
  return {
    amount: contract.invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    currency: first.currency,
  };
}

/**
 * How much of the term has gone by, which is what the projection beside it
 * rests on: a fortnight into a year, the trend is a rounding error carried
 * twenty-six times.
 */
function getElapsedShare(usage: ContractUsage): number {
  const from = new Date(usage.periodFrom).getTime();
  const until = new Date(usage.periodEndsAt).getTime();
  return Math.min(1, Math.max(0, (Date.now() - from) / (until - from)));
}

/**
 * What the term has got through, against what it includes.
 *
 * The term rather than the month the rest of the row reports: a yearly quota
 * resets once a year, so this is the count the contract's renewal will be
 * argued over — and the one figure on the row that says whether the amount
 * beside it is still the right price.
 */
function ContractUsageCell(props: { usage: ContractUsage | null }) {
  const { usage } = props;

  if (!usage) {
    return (
      <td className="p-4 text-right text-sm tabular-nums">
        <span className="text-low">—</span>
      </td>
    );
  }

  return (
    <td className="p-4 text-right text-sm tabular-nums">
      <Hint
        content={`Term opened ${DATE_FORMAT.format(new Date(usage.periodFrom))}.`}
      >
        {SCREENSHOTS_FORMAT.format(usage.screenshotsCount)}
      </Hint>
      <div className="text-low text-xs">
        / {SCREENSHOTS_FORMAT.format(usage.includedScreenshots)}
      </div>
    </td>
  );
}

/**
 * What the contract was sold for, and what it has been worth once the overage
 * its term has run up is counted.
 *
 * One column rather than two: the pair is the same quantity at two moments, and
 * a second column holding the contract's own amount over again was blank on
 * every row that had run up nothing. Stacked the way the usage cell is —
 * what actually happened above what was contracted for.
 *
 * In the contract's own currency: the pair is what a renewal is argued from,
 * and both halves of that argument are quoted at the customer in the money they
 * are billed in. The euro figure the rest of the page is kept in is in the
 * tooltip, and in the monthly rate to the right.
 */
function ContractPlanCell(props: { contract: YearlyContract }) {
  const { contract } = props;
  const { usage } = contract;
  const contracted = getOriginalTotal(contract);

  if (contract.amount === null) {
    return (
      <td className="p-4 text-right text-sm tabular-nums">
        <Hint className="text-danger-low" content="Counts nothing.">
          no invoice found
        </Hint>
      </td>
    );
  }

  // Both amounts come off one Stripe customer, so they disagree on a currency
  // only when something upstream is wrong — and an overage added at parity to
  // a total in another currency would be a figure nobody could trace.
  const overage =
    contracted &&
    usage &&
    usage.additionalPrice.currency === contracted.currency
      ? usage.additionalPrice.amount
      : 0;

  const contractedAmount = (
    <Hint
      content={
        <div className="flex flex-col gap-1">
          {contract.invoices.map((invoice, invoiceIndex) => (
            <div key={invoiceIndex}>{describeInvoice(invoice)}</div>
          ))}
        </div>
      }
    >
      {contracted ? (
        formatInvoiceAmount(contracted)
      ) : (
        // Invoices in more than one currency have no single original amount;
        // the monthly rate beside this one still holds.
        <span className="text-low">—</span>
      )}
    </Hint>
  );

  return (
    <td className="p-4 text-right text-sm tabular-nums">
      {contracted && overage > 0 ? (
        <>
          <ContractToDateAmount
            contract={contract}
            amount={{
              amount: contracted.amount + overage,
              currency: contracted.currency,
            }}
          />
          <div className="text-low text-xs">{contractedAmount}</div>
        </>
      ) : (
        contractedAmount
      )}
      {contract.awaitingPayment ? (
        <div>
          <Hint
            className="text-warning-low"
            content="Raised, not yet paid. Counted — expected to clear."
          >
            Awaiting payment
          </Hint>
        </div>
      ) : null}
    </td>
  );
}

/** The contract once its overage is counted, in the currency it is billed in. */
function ContractToDateAmount(props: {
  contract: YearlyContract;
  amount: { amount: number; currency: string };
}) {
  const { contract, amount } = props;
  const label = formatInvoiceAmount(amount);

  // Nothing to add on a contract already in euros: the tooltip would restate
  // the figure it is attached to.
  if (amount.currency === "eur") {
    return label;
  }

  invariant(contract.amount !== null, "an amount to date has a contract");

  return (
    <Hint
      content={`${CONTRACT_PRICE_FORMAT.format(contract.amount + (contract.usage?.additionalCost ?? 0))} at the fixed rate.`}
    >
      {label}
    </Hint>
  );
}

/**
 * What the contract adds to the month: its own share of it, plus what a month
 * of the term's usage has been worth.
 */
function ContractPerMonthCell(props: {
  contract: YearlyContract;
  usage: ContractUsage | null;
}) {
  const { contract, usage } = props;

  if (contract.amount === null) {
    return (
      <td className="p-4 text-right text-sm tabular-nums">
        <span className="text-low">—</span>
      </td>
    );
  }

  const overage = usage?.monthlyAdditionalCost ?? 0;

  return (
    <td className="p-4 text-right text-sm tabular-nums">
      {usage && overage > 0 ? (
        <Hint
          content={`${CONTRACT_PRICE_FORMAT.format(contract.monthlyRevenue)} of contract + ${CONTRACT_PRICE_FORMAT.format(overage)} of overage, averaged over the ${SHARE_FORMAT.format(getElapsedShare(usage))} of the term gone by.`}
        >
          {CONTRACT_PRICE_FORMAT.format(contract.monthlyRevenue + overage)}
        </Hint>
      ) : (
        CONTRACT_PRICE_FORMAT.format(contract.monthlyRevenue)
      )}
    </td>
  );
}

/**
 * Where the term lands if it carries on at the rate it has run at — the
 * screenshots it reaches by the renewal, and what the contract would then be
 * worth.
 *
 * A straight line, which is the whole point: it is the figure a renewal is
 * offered against — this many screenshots a year, at this price — and a
 * customer already twice past its quota is one nobody should be re-signing at
 * last year's rate.
 */
function ContractAtRenewalCell(props: { usage: ContractUsage | null }) {
  const { usage } = props;

  // Tested on what the column would print rather than on the figure behind it:
  // a term on course to stay inside its quota and one whose overage rounds
  // away to nothing are the same row to read, and a printed zero reads as a
  // figure rather than as an absence.
  if (!usage || roundProjectedEuros(usage.projectedAdditionalCost) === 0) {
    return <td className="p-4" />;
  }

  // An amount that survived the rounding above was billed on screenshots, so
  // there are always some to name under it.
  const screenshots =
    usage.projectedScreenshotsCount - usage.includedScreenshots;

  return (
    <td className="p-4 text-right text-sm tabular-nums">
      <Hint
        content={`${formatProjectedScreenshots(screenshots)} past the quota, ${formatProjectedScreenshots(usage.projectedScreenshotsCount)} in all, from the ${SHARE_FORMAT.format(getElapsedShare(usage))} of the term gone by.`}
      >
        {formatProjectedEuros(usage.projectedAdditionalCost)}
      </Hint>
      <div className="text-low text-xs">
        {COMPACT_SCREENSHOTS_FORMAT.format(screenshots)} screenshots
      </div>
    </td>
  );
}

function ContractRow(props: { contract: YearlyContract; index: number }) {
  const { contract, index } = props;

  return (
    <tr className={clsx(index % 2 === 0 ? "bg-app" : "bg-subtle", "border-b")}>
      <td className="p-4 text-left text-sm font-medium">
        <div className="flex items-center gap-2">
          <Link href={`/${contract.slug}`}>
            {contract.name ?? contract.slug}
          </Link>
          <StripeCustomerLink stripeCustomerId={contract.stripeCustomerId} />
        </div>
      </td>
      <ContractPlanCell contract={contract} />
      <ContractPerMonthCell contract={contract} usage={contract.usage} />
      <ContractUsageCell usage={contract.usage} />
      <ContractAtRenewalCell usage={contract.usage} />
      {/* How long the term has left: what the quota resets in, and the stretch
          the projection beside it is carried over. Read as a distance rather
          than as a date because that is the question — a renewal three weeks
          out is a call to make now. `Time` carries the date itself in its own
          tooltip. A contract Argos no longer bills has no next term. */}
      <td className="p-4 text-right text-sm">
        {contract.usage ? (
          <Time date={contract.usage.periodEndsAt} />
        ) : (
          <span className="text-low">—</span>
        )}
      </td>
    </tr>
  );
}

/**
 * The annual contracts one by one — the makeup of the yearly figure.
 *
 * Listed so the figure can be audited: the rate is a sum of twelfths read from
 * Stripe, and when it looks wrong, the contract at fault can only be found by
 * seeing each one's renewal — including the contracts that contributed
 * nothing, which the total alone would hide.
 *
 * The amounts carry the overage the terms have run up, which no invoice
 * accounts for yet, so they read above the yearly band on the cards. That is
 * the point: the cards report what was invoiced, and a contract is worth what
 * it was sold for plus what its usage ran past the quota.
 */
function YearlyContracts(props: { contracts: readonly YearlyContract[] }) {
  const { contracts } = props;
  // Summed from what each contract contributes rather than divided by twelve:
  // the months are amortized over the stretch each invoice pays for, and an
  // upsell sold for five months is not a twelfth of anything.
  const monthlyTotal = contracts.reduce(
    (sum, contract) =>
      sum +
      contract.monthlyRevenue +
      (contract.usage?.monthlyAdditionalCost ?? 0),
    0,
  );
  // What the annual book is on course to bill past its quotas by the time the
  // terms renew — the one figure here that no invoice exists for at all.
  const projectedOverageTotal = contracts.reduce(
    (sum, contract) => sum + (contract.usage?.projectedAdditionalCost ?? 0),
    0,
  );

  return (
    <div className="mt-6">
      <div className="mb-3">
        <h3 className="font-semibold">Annual contracts</h3>
      </div>
      {contracts.length === 0 ? (
        <p className="text-low text-sm">No annual contracts in force.</p>
      ) : (
        <div className="overflow-x-auto rounded-sm border">
          <table className="w-full min-w-256 table-fixed border-collapse">
            <thead>
              <tr className="text-low border-b text-xs font-semibold">
                <th className="w-[25%] px-4 py-3 text-left">Team</th>
                <th className="w-[15%] px-4 py-3 text-right">
                  <Hint content="What it was sold for, and above it what it has been worth once the overage is counted.">
                    Plan
                  </Hint>
                </th>
                <th className="w-[14%] px-4 py-3 text-right">
                  <Hint content="What it adds to this month, in euros — contract plus overage.">
                    Per month
                  </Hint>
                </th>
                <th className="w-[15%] px-4 py-3 text-right">Usage</th>
                <th className="w-[19%] px-4 py-3 text-right">
                  <Hint content="What the term is on course to owe past its quota if usage carries on at this rate. Rounded.">
                    Overage at renewal
                  </Hint>
                </th>
                <th className="w-[12%] px-4 py-3 text-right">Renewal</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract, index) => (
                <ContractRow
                  key={contract.stripeCustomerId}
                  contract={contract}
                  index={index}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-medium">
                <td className="p-4 text-left">Total</td>
                {/* The contracts are each stated in their own currency, and a
                    sum across currencies is not a figure. */}
                <td />
                <td className="p-4 text-right tabular-nums">
                  {CONTRACT_PRICE_FORMAT.format(monthlyTotal)}
                </td>
                <td />
                <td className="p-4 text-right tabular-nums">
                  {formatProjectedEuros(projectedOverageTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function StaffRevenuePage() {
  const { data, error } = useQuery(StaffRevenueQuery, {
    variables: { months: PAGE_MONTHS },
  });
  const months = data?.staffRevenue.months ?? null;
  const contracts = data?.staffRevenue.yearlyContracts ?? null;
  const projection = data?.staffRevenue.projection ?? null;

  // Told rather than reported as a failed figure, as the other staff pages do:
  // a reader without access has no figures to wait for, and three tiles reading
  // "unavailable" would send them looking for an outage. Every other failure
  // stays on the tiles, where it does not take the page down with it.
  const isForbidden =
    error !== undefined &&
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "FORBIDDEN");

  if (isForbidden) {
    return (
      <PageContainer>
        <Alert>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertText>This page is only available to staff users.</AlertText>
          <AlertText>
            <Link href="/teams">Go to your teams</Link>
          </AlertText>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Revenue</Heading>
        </PageHeaderContent>
      </PageHeader>
      <RevenueCards
        months={months}
        projection={projection}
        error={error ?? null}
      />
      {months && contracts ? (
        <>
          <ChartCard className="mb-6" title="Invoiced by month">
            <RevenueChart months={months} />
          </ChartCard>
          <RevenueHistory months={months} />
          <YearlyContracts contracts={contracts} />
        </>
      ) : error ? null : (
        <ChartCard className="mb-6" title="Invoiced by month">
          <Loader className="size-8" delay={0} />
        </ChartCard>
      )}
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>Staff Revenue</title>
      </Helmet>
      <AuthGuard>{() => <StaffRevenuePage />}</AuthGuard>
    </Page>
  );
}
