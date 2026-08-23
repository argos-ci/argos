import { useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  TrendingDownIcon,
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
import { StatTile } from "@/ui/StatTile";
import { Tooltip } from "@/ui/Tooltip";

import { getStripeCustomerURL, getStripeSubscriptionURL } from "./stripe";

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
        teams {
          slug
          name
          stripeCustomerId
          amount
          currency
          revenue
        }
        yearlyPlans {
          revenue
          teamsCount
          foreignRevenue
        }
      }
      yearlyContracts {
        slug
        name
        stripeSubscriptionId
        amount
        awaitingPayment
        invoices {
          amount
          currency
          invoicedAt
          coveredFrom
          coveredUntil
        }
      }
      githubMarketplaceMonthlyRevenue
    }
  }
`);

type RevenueData = DocumentType<typeof StaffRevenueQuery>["staffRevenue"];
type RevenueMonth = RevenueData["months"][number];
type YearlyContract = RevenueData["yearlyContracts"][number];
type Split = RevenueMonth["monthlyPlans"];

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
  "Annual contracts amortized, day by day, over the months they cover. In €.";

const GITHUB_HINT =
  "Active Marketplace subscriptions at list price, billed by GitHub. On top of the figure above, not in it.";

/**
 * Stands in for the hint line while the figures load.
 *
 * `StatTile` only reserves that line's height when it is given a hint at all,
 * and blanks its content on its own while loading. Handing it nothing until the
 * data lands drops the line entirely, so the card grows under the reader the
 * moment it arrives.
 */
const HINT_PLACEHOLDER = " ";

/**
 * The month an amount covers, named.
 *
 * Read in UTC, which is where the server cut the month — formatting in the
 * reader's own zone would name the month before it for anyone west of
 * Greenwich.
 */
const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

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
 * Every amount on this page is in euros — the currency the business is run
 * in — where the other staff pages price plans in dollars. Dollar invoices are
 * converted server-side at a fixed rate, which the foreign-share caveats own.
 */
const EUR_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatEuros(amount: number): string {
  return EUR_PRICE_FORMAT.format(amount);
}

/** Amounts on the axis, shortened, in the page's euros. */
const AXIS_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 0,
});

/**
 * Amounts in the contracts table, with cents.
 *
 * The rest of the page rounds to the euro, but this table exists to be added
 * up against the yearly figure, and twelfths carry cents — a rounded list
 * would not sum to its own total.
 */
const CONTRACT_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
});

/**
 * An invoice in the currency it was raised in — the audit trail to Stripe.
 *
 * Local formatters rather than util/intl's `formatCurrency`: that one follows
 * the reader's locale, where every figure on this page is pinned to en-US so
 * the amounts read the same on every staff screen.
 */
const INVOICE_PRICE_FORMATS = new Map<string, Intl.NumberFormat>();
function formatInvoiceAmount(invoice: {
  amount: number;
  currency: string;
}): string {
  const currency = invoice.currency.toUpperCase();
  let format = INVOICE_PRICE_FORMATS.get(currency);
  if (!format) {
    format = new Intl.NumberFormat("en-US", { style: "currency", currency });
    INVOICE_PRICE_FORMATS.set(currency, format);
  }
  return format.format(invoice.amount);
}

/** A renewal's date, read in UTC like every other date on the page. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatMonth(month: string): string {
  return MONTH_FORMAT.format(new Date(month));
}

/** The figures behind a half, appended to its tooltip. */
function getSplitNote(split: Split): string {
  const teams = ` ${split.teamsCount} ${split.teamsCount === 1 ? "team" : "teams"}.`;
  // Named only when there is some: on an all-euro month the caveat would be
  // noise, and on a month with dollars in it the reader has to know part of
  // the total went through the fixed rate.
  const foreign =
    split.foreignRevenue > 0
      ? ` ${formatEuros(split.foreignRevenue)} converted from dollars at a fixed rate.`
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
function MonthSplit(props: {
  month: RevenueMonth;
  monthlyHint: string;
  github: number | null;
}) {
  const { month, monthlyHint, github } = props;

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
        tooltip={YEARLY_HINT}
      />
      {github !== null ? (
        <>
          {" · "}
          <SplitAmount amount={github} label="GitHub" tooltip={GITHUB_HINT} />
        </>
      ) : null}
    </>
  );
}

/** The three headline figures, rendered from whatever window was read. */
function RevenueCards(props: {
  /** Oldest first, the running month last. Null while loading. */
  months: readonly RevenueMonth[] | null;
  /** The GitHub Marketplace rate, shown beside each month's split. */
  github: number | null;
  error: Error | null;
}) {
  const { months, github, error } = props;

  // The last two are the only ones the cards read, whatever the window.
  const currentMonth = months?.at(-1) ?? null;
  const lastMonth = months?.at(-2) ?? null;
  const growth =
    currentMonth && lastMonth
      ? getGrowth(currentMonth.revenue, lastMonth.revenue)
      : null;

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
        label="Last month"
        value={readValue(lastMonth?.revenue ?? null)}
        format="currency"
        currency="EUR"
        hint={
          unavailable ??
          (lastMonth ? (
            <MonthSplit
              month={lastMonth}
              monthlyHint={LAST_MONTHLY_HINT}
              github={github}
            />
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
        label="Current month"
        value={readValue(currentMonth?.revenue ?? null)}
        format="currency"
        currency="EUR"
        hint={
          unavailable ??
          (currentMonth ? (
            <MonthSplit
              month={currentMonth}
              monthlyHint={CURRENT_MONTHLY_HINT}
              github={github}
            />
          ) : (
            HINT_PLACEHOLDER
          ))
        }
      />
      <StatTile
        data-visual-test="transparent"
        icon={growth !== null && growth < 0 ? TrendingDownIcon : TrendingUpIcon}
        color={growth !== null && growth < 0 ? "warning" : "success"}
        label="Month over month"
        value={readValue(growth)}
        format="percent"
        hint={
          unavailable ??
          (currentMonth && lastMonth && growth !== null ? (
            <Hint
              content={`${formatMonth(currentMonth.month)} (${formatEuros(currentMonth.revenue)}) vs ${formatMonth(lastMonth.month)} (${formatEuros(lastMonth.revenue)}). The running month is still filling.`}
            >
              {formatMonth(currentMonth.month)} vs{" "}
              {formatMonth(lastMonth.month)}
            </Hint>
          ) : months ? (
            "nothing to compare"
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
 */
function RevenueChart(props: {
  months: readonly RevenueMonth[];
  github: number;
}) {
  const data = props.months.map((month) => ({
    month: month.month,
    monthly: month.monthlyPlans.revenue,
    yearly: month.yearlyPlans.revenue,
    github: props.github,
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
              {percent > 0 ? "+" : ""}
              {percent}%
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
          {month.teams.length > 0 ? (
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
            <div className="bg-app overflow-x-auto rounded-sm border">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="text-low border-b text-xs font-semibold">
                    <th className="w-[40%] px-4 py-2.5 text-left">Team</th>
                    <th className="w-[22%] px-4 py-2.5 text-right">Invoiced</th>
                    <th className="w-[22%] px-4 py-2.5 text-right">In euros</th>
                    <th className="w-[16%] px-4 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {month.teams.map((team, teamIndex) => (
                    <tr
                      key={team.stripeCustomerId}
                      className={clsx(
                        "text-sm",
                        teamIndex !== month.teams.length - 1 && "border-b",
                      )}
                    >
                      <td className="px-4 py-2.5 text-left">
                        <Link href={`/${team.slug}`}>
                          {team.name ?? team.slug}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {team.currency !== null ? (
                          formatInvoiceAmount({
                            amount: team.amount,
                            currency: team.currency,
                          })
                        ) : (
                          <span className="text-low">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatEuros(team.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={getStripeCustomerURL(team.stripeCustomerId)}
                          target="_blank"
                        >
                          Stripe
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  const covers =
    invoice.coveredFrom && invoice.coveredUntil
      ? `, covers ${DATE_FORMAT.format(new Date(invoice.coveredFrom))} to ${DATE_FORMAT.format(new Date(invoice.coveredUntil))}`
      : "";
  return `${formatInvoiceAmount(invoice)} invoiced ${DATE_FORMAT.format(new Date(invoice.invoicedAt))}${covers}.`;
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

function ContractRow(props: { contract: YearlyContract; index: number }) {
  const { contract, index } = props;
  const newestInvoice = contract.invoices[0] ?? null;
  const originalTotal = getOriginalTotal(contract);

  return (
    <tr className={clsx(index % 2 === 0 ? "bg-app" : "bg-subtle", "border-b")}>
      <td className="p-4 text-left text-sm font-medium">
        <Link href={`/${contract.slug}`}>{contract.name ?? contract.slug}</Link>
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {contract.amount !== null ? (
          <>
            <Hint
              content={
                <div className="flex flex-col gap-1">
                  {contract.invoices.map((invoice, invoiceIndex) => (
                    <div key={invoiceIndex}>{describeInvoice(invoice)}</div>
                  ))}
                </div>
              }
            >
              {originalTotal
                ? formatInvoiceAmount(originalTotal)
                : CONTRACT_PRICE_FORMAT.format(contract.amount)}
            </Hint>
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
          </>
        ) : (
          <Hint className="text-danger-low" content="Counts nothing.">
            no invoice found
          </Hint>
        )}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {contract.amount !== null ? (
          CONTRACT_PRICE_FORMAT.format(contract.amount / 12)
        ) : (
          <span className="text-low">—</span>
        )}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {newestInvoice ? (
          DATE_FORMAT.format(new Date(newestInvoice.invoicedAt))
        ) : (
          <span className="text-low">—</span>
        )}
      </td>
      <td className="p-4 text-right text-sm">
        <Link
          href={getStripeSubscriptionURL(contract.stripeSubscriptionId)}
          target="_blank"
        >
          Stripe
        </Link>
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
 */
function YearlyContracts(props: { contracts: readonly YearlyContract[] }) {
  const { contracts } = props;
  const total = contracts.reduce(
    (sum, contract) => sum + (contract.amount ?? 0),
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
          <table className="w-full min-w-160 table-fixed border-collapse">
            <thead>
              <tr className="text-low border-b text-xs font-semibold">
                <th className="w-[30%] px-4 py-3 text-left">Team</th>
                <th className="w-[20%] px-4 py-3 text-right">Invoiced</th>
                <th className="w-[16%] px-4 py-3 text-right">
                  <Hint content="÷ 12, in euros.">Per month</Hint>
                </th>
                <th className="w-[18%] px-4 py-3 text-right">Last invoice</th>
                <th className="w-[16%] px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract, index) => (
                <ContractRow
                  key={contract.stripeSubscriptionId}
                  contract={contract}
                  index={index}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-medium">
                <td className="p-4 text-left">Total</td>
                <td className="p-4 text-right tabular-nums">
                  <Hint content="In euros.">
                    {CONTRACT_PRICE_FORMAT.format(total)}
                  </Hint>
                </td>
                <td className="p-4 text-right tabular-nums">
                  {CONTRACT_PRICE_FORMAT.format(total / 12)}
                </td>
                <td />
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
        github={data?.staffRevenue.githubMarketplaceMonthlyRevenue ?? null}
        error={error ?? null}
      />
      {data && months && contracts ? (
        <>
          <ChartCard className="mb-6" title="Invoiced by month">
            <RevenueChart
              months={months}
              github={data.staffRevenue.githubMarketplaceMonthlyRevenue}
            />
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
