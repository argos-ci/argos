import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
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
import { Text } from "@/ui/Text";
import { Tooltip } from "@/ui/Tooltip";

import { formatPrice } from "./pricing";
import { getStripeSubscriptionURL } from "./stripe";

/**
 * Asked on its own rather than alongside the team directory: it walks Stripe's
 * invoices, so the two load beside each other, each with its own skeleton, and
 * a slow answer never holds a row of the table back.
 *
 * Every month costs a walk of its own, which is why the count is asked for
 * rather than fixed: the band above the directory wants three, the page that
 * charts a year wants twelve, and neither should pay for the other.
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
const LAST_MONTHLY_HINT =
  "Invoices issued last month, excluding tax and net of credit notes — what Stripe charged, discounts included.";

const CURRENT_MONTHLY_HINT =
  "Invoices issued so far this month, excluding tax and net of credit notes. Partial by nature: the month is not over.";

const YEARLY_HINT =
  "Annual contracts in force: their contract invoices ÷ 12. A rate, so it is the same every month rather than a spike in the renewal month.";

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
 * Amounts on the axis, shortened.
 *
 * Fixed to the same locale and currency as `formatPrice` rather than the
 * reader's own: every other figure on the page is printed in US dollars, and an
 * axis that followed the browser would label the same money differently from
 * the cards above it.
 */
const AXIS_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

/**
 * Amounts in the contracts table, with cents.
 *
 * The rest of the page rounds to the dollar, but this table exists to be added
 * up against the yearly figure, and twelfths carry cents — a rounded list
 * would not sum to its own total.
 */
const CONTRACT_PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
  // Named only when there is some: on an all-dollar month the caveat would be
  // noise, and on a month with euros in it the reader has to know the total
  // holds two currencies added at parity.
  const foreign =
    split.foreignRevenue > 0
      ? ` ${formatPrice(split.foreignRevenue)} of it was invoiced in another currency and is counted at parity, not converted.`
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

/** One half of the amount, with the tooltip that explains that half alone. */
function SplitAmount(props: {
  amount: number;
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip content={props.tooltip}>
      <span className="underline decoration-dotted underline-offset-2">
        {formatPrice(props.amount)} {props.label}
      </span>
    </Tooltip>
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
        label="monthly"
        tooltip={`${monthlyHint}${getSplitNote(month.monthlyPlans)}`}
      />
      {" · "}
      <SplitAmount
        amount={month.yearlyPlans.revenue}
        label="yearly"
        tooltip={`${YEARLY_HINT}${getSplitNote(month.yearlyPlans)}`}
      />
    </>
  );
}

/**
 * The three headline figures, rendered from whatever window was read.
 *
 * Takes the months rather than fetching them, so the band above the directory
 * and the page that charts a year draw the same cards off one query each rather
 * than asking twice.
 */
function RevenueCards(props: {
  /** Oldest first, the running month last. Null while loading. */
  months: readonly RevenueMonth[] | null;
  error: Error | null;
}) {
  const { months, error } = props;

  // The last two are the only ones the cards read, whatever the window.
  const currentMonth = months?.at(-1) ?? null;
  const lastMonth = months?.at(-2) ?? null;
  const growth =
    currentMonth && lastMonth
      ? getGrowth(currentMonth.revenue, lastMonth.revenue)
      : null;

  // An em dash on all three rather than a band that disappears: the figures
  // failing to load is worth seeing on a page whose whole subject is what they
  // report, and it must not take the directory down with it.
  //
  // The reason is carried rather than swallowed. This reads a third party at
  // request time, so it fails in ways only its message explains — a key missing
  // a permission, a rate limit, a key in the wrong mode — and this page is
  // staff-only, so there is nobody here to protect from the detail.
  const unavailable = error ? (
    <Tooltip content={error.message}>
      <span className="underline decoration-dotted underline-offset-2">
        unavailable
      </span>
    </Tooltip>
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
        color="success"
        label="Last month"
        value={readValue(lastMonth?.revenue ?? null)}
        format="currency"
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
        color="primary"
        label="Current month"
        value={readValue(currentMonth?.revenue ?? null)}
        format="currency"
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
        icon={growth !== null && growth < 0 ? TrendingDownIcon : TrendingUpIcon}
        color={growth !== null && growth < 0 ? "warning" : "success"}
        label="Month over month"
        value={readValue(growth)}
        format="percent"
        hint={
          unavailable ??
          (currentMonth && lastMonth && growth !== null ? (
            <Tooltip
              content={`${formatMonth(currentMonth.month)} at ${formatPrice(currentMonth.revenue)} against ${formatMonth(lastMonth.month)} at ${formatPrice(lastMonth.revenue)}. The running month is still filling, so this starts the month deeply negative and climbs as the invoices land — it is only comparable to the month before it on the last day.`}
            >
              <span className="underline decoration-dotted underline-offset-2">
                {formatMonth(currentMonth.month)} vs{" "}
                {formatMonth(lastMonth.month)}
              </span>
            </Tooltip>
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
 * The two series, in a fixed order with fixed colours.
 *
 * Order and colour follow the halves themselves, not their size: the monthly
 * book keeps its colour whether it is the larger half or not, so a month where
 * the two cross over does not repaint the chart.
 *
 * Violet is the app's own accent, which the account analytics already draw
 * their primary series in — the dominant half wears it. Grass is the second
 * because it is far enough from violet on the blue-yellow axis to survive
 * colour blindness: the pair separates by ΔE 28 under deuteranopia and 33 to
 * normal vision. Grass sits just under 3:1 against the light surface, which the
 * legend and the table below relieve.
 */
const CHART_SERIES = [
  { key: "monthly", label: "Monthly plans", color: "var(--violet-9)" },
  { key: "yearly", label: "Yearly plans", color: "var(--grass-9)" },
] as const;

const CHART_CONFIG: ChartConfig = {
  monthly: { label: "Monthly plans", color: "var(--violet-9)" },
  yearly: { label: "Yearly plans", color: "var(--grass-9)" },
};

/**
 * The window as stacked areas, one point per complete month.
 *
 * Stacked because the two halves compose the total the cards report, so the
 * height of the band is the figure and its split is where it came from. Areas
 * rather than bars because what is being read here is a trend over a year, and
 * a filled band carries a slope where twelve separate bars make the reader
 * measure heights against each other.
 *
 * The running month is left out, as it is from the table: a partial point
 * dragged the line down every month, which reads as a collapse rather than as a
 * month still filling.
 */
function RevenueChart(props: { months: readonly RevenueMonth[] }) {
  const data = props.months.slice(0, -1).map((month) => ({
    month: month.month,
    monthly: month.monthlyPlans.revenue,
    yearly: month.yearlyPlans.revenue,
  }));

  return (
    <ChartContainer
      config={CHART_CONFIG}
      className="h-full w-full"
      data-visual-test="transparent"
    >
      <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
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
              formatter={(value) => formatPrice(Number(value))}
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
            fill={series.color}
            fillOpacity={0.4}
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
  index: number;
  isLast: boolean;
}) {
  const { month, before, index, isLast } = props;
  // On the monthly figure, like every column here: the yearly rate lives in
  // its own table, and a change diluted by a flat rate would understate every
  // move.
  const growth = before
    ? getGrowth(month.monthlyPlans.revenue, before.monthlyPlans.revenue)
    : null;

  return (
    <tr
      className={clsx(
        index % 2 === 0 ? "bg-app" : "bg-subtle",
        !isLast && "border-b",
      )}
    >
      <td className="p-4 text-left text-sm font-medium">
        {MONTH_YEAR_FORMAT.format(new Date(month.month))}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {formatPrice(month.monthlyPlans.revenue)}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {growth === null ? (
          <span className="text-low">—</span>
        ) : (
          <span className={growth < 0 ? "text-danger-low" : "text-success-low"}>
            {growth > 0 ? "+" : ""}
            {Math.round(growth * 100)}%
          </span>
        )}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {month.monthlyPlans.teamsCount}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {month.monthlyPlans.teamsCount > 0 ? (
          formatPrice(
            month.monthlyPlans.revenue / month.monthlyPlans.teamsCount,
          )
        ) : (
          <span className="text-low">—</span>
        )}
      </td>
    </tr>
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
  // The running month is left out: it is partial, so a column comparing it to
  // complete months would report a drop that is only the calendar.
  const complete = months.slice(0, -1);
  const rows = [...complete].reverse();

  return (
    <div>
      <div className="mb-3">
        <h3 className="font-semibold">Monthly plans</h3>
      </div>
      <div className="overflow-x-auto rounded-sm border">
        <table className="w-full min-w-160 table-fixed border-collapse">
          <thead>
            <tr className="text-low border-b text-xs font-semibold">
              <th className="w-[22%] px-4 py-3 text-left">Month</th>
              <th className="w-[21%] px-4 py-3 text-right">
                <Tooltip content="Invoices issued that month, excluding tax and net of credit notes — what Stripe charged, discounts included.">
                  <span className="underline decoration-dotted underline-offset-2">
                    Invoiced
                  </span>
                </Tooltip>
              </th>
              <th className="w-[18%] px-4 py-3 text-right">
                <Tooltip content="Against the month before it.">
                  <span className="underline decoration-dotted underline-offset-2">
                    Change
                  </span>
                </Tooltip>
              </th>
              <th className="w-[18%] px-4 py-3 text-right">
                <Tooltip content="Teams invoiced that month.">
                  <span className="underline decoration-dotted underline-offset-2">
                    Teams
                  </span>
                </Tooltip>
              </th>
              <th className="w-[21%] px-4 py-3 text-right">
                <Tooltip content="The month's invoices over its teams — what the average team was billed.">
                  <span className="underline decoration-dotted underline-offset-2">
                    Per team
                  </span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((month, index) => (
              <HistoryRow
                key={month.month}
                month={month}
                // `rows` runs newest first, so the month before is the next one.
                before={rows[index + 1] ?? null}
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
  return `${CONTRACT_PRICE_FORMAT.format(invoice.amount)} invoiced ${DATE_FORMAT.format(new Date(invoice.invoicedAt))}${covers}.`;
}

/** One contract, the invoices it is worth and what it adds per month. */
function ContractRow(props: { contract: YearlyContract; index: number }) {
  const { contract, index } = props;
  const newestInvoice = contract.invoices[0] ?? null;
  const foreignCurrencies = [
    ...new Set(
      contract.invoices
        .filter((invoice) => invoice.currency !== "usd")
        .map((invoice) => invoice.currency.toUpperCase()),
    ),
  ];

  return (
    <tr className={clsx(index % 2 === 0 ? "bg-app" : "bg-subtle", "border-b")}>
      <td className="p-4 text-left text-sm font-medium">
        <Link href={`/${contract.slug}`}>{contract.name ?? contract.slug}</Link>
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {contract.amount !== null ? (
          <>
            <Tooltip
              content={
                <div className="flex flex-col gap-1">
                  {contract.invoices.map((invoice, invoiceIndex) => (
                    <div key={invoiceIndex}>{describeInvoice(invoice)}</div>
                  ))}
                </div>
              }
            >
              <span className="underline decoration-dotted underline-offset-2">
                {CONTRACT_PRICE_FORMAT.format(contract.amount)}
              </span>
            </Tooltip>
            {contract.invoices.length > 1 ? (
              <span className="text-low">
                {" "}
                ({contract.invoices.length} invoices)
              </span>
            ) : null}
            {foreignCurrencies.length > 0 ? (
              <span className="text-low">
                {" "}
                ({foreignCurrencies.join(", ")} at parity)
              </span>
            ) : null}
            {contract.awaitingPayment ? (
              <Tooltip content="The invoice was raised but has not been paid yet, so it counts nothing until it clears.">
                <span className="text-warning-low underline decoration-dotted underline-offset-2">
                  {" "}
                  awaiting payment
                </span>
              </Tooltip>
            ) : null}
          </>
        ) : (
          <Tooltip content="No invoice reading as this contract was found on the customer, so it adds nothing to the yearly figure. Its invoices are worth a look in Stripe.">
            <span className="text-danger-low underline decoration-dotted underline-offset-2">
              no invoice found
            </span>
          </Tooltip>
        )}
      </td>
      <td className="p-4 text-right text-sm tabular-nums">
        {contract.amount !== null && !contract.awaitingPayment ? (
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
  // Awaiting-payment invoices are listed but not counted, like in the figure.
  const total = contracts.reduce(
    (sum, contract) =>
      sum + (contract.awaitingPayment ? 0 : (contract.amount ?? 0)),
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
                <th className="w-[20%] px-4 py-3 text-right">
                  <Tooltip content="The contract's invoices added up — its latest annual bill, plus upsells raised on top of it since — excluding tax and net of credit notes.">
                    <span className="underline decoration-dotted underline-offset-2">
                      Invoiced
                    </span>
                  </Tooltip>
                </th>
                <th className="w-[16%] px-4 py-3 text-right">
                  <Tooltip content="The renewal over twelve — this column adds up to the Yearly plans figure.">
                    <span className="underline decoration-dotted underline-offset-2">
                      Per month
                    </span>
                  </Tooltip>
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
                  {CONTRACT_PRICE_FORMAT.format(total)}
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
          <Text slot="headline">
            What Argos invoiced, month by month, read from Stripe.
          </Text>
        </PageHeaderContent>
      </PageHeader>
      <RevenueCards months={months} error={error ?? null} />
      {months && contracts ? (
        <>
          <ChartCard
            className="mb-6"
            title="Invoiced by month"
            description="Complete months only — the one running is still filling."
          >
            <RevenueChart months={months} />
          </ChartCard>
          <RevenueHistory months={months} />
          <YearlyContracts contracts={contracts} />
        </>
      ) : error ? null : (
        <ChartCard
          className="mb-6"
          title="Invoiced by month"
          description="Complete months only — the one running is still filling."
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader className="size-8" delay={0} />
            {/* Said rather than left to a spinner: this walks a year of Stripe
                invoices, which is seconds rather than the moment a spinner
                usually stands for — and knowing why it is slow is the
                difference between waiting and reloading. */}
            <div className="text-low max-w-sm text-sm">
              Reading {PAGE_MONTHS} months of invoices from Stripe. Nothing is
              stored, so this takes a few seconds the first time each hour.
            </div>
          </div>
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
