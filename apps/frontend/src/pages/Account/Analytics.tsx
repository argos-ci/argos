import { Suspense, useCallback, useEffect, useId, useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { getLocalTimeZone, today } from "@internationalized/date";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import {
  FileDownIcon,
  GitCompareArrowsIcon,
  ImagesIcon,
  LayersIcon,
  SearchIcon,
  ThumbsUpIcon,
} from "lucide-react";
import moment from "moment";
import { useFilter } from "react-aria";
import {
  Autocomplete,
  Heading,
  Input,
  MenuTrigger,
  SearchField,
  Text,
} from "react-aria-components";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { graphql } from "@/gql";
import {
  TimeSeriesGroupBy,
  type AccountUsage_AccountQuery,
} from "@/gql/graphql";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  getChartColorFromIndex,
  getTimeTicks,
} from "@/ui/Charts";
import { DateRangePicker } from "@/ui/DateRangePicker";
import { IconButton } from "@/ui/IconButton";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Menu, MenuItem } from "@/ui/Menu";
import { PageLoader } from "@/ui/PageLoader";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { Tooltip } from "@/ui/Tooltip";

import { useAccountParams } from "./AccountParams";

const AccountQuery = graphql(`
  query AccountUsage_account(
    $slug: String!
    $from: DateTime!
    $to: DateTime!
    $groupBy: TimeSeriesGroupBy!
    $projectIds: [ID!]
  ) {
    account(slug: $slug) {
      id
      permissions
      metrics(
        input: {
          from: $from
          to: $to
          groupBy: $groupBy
          projectIds: $projectIds
        }
      ) {
        screenshots {
          all {
            total
            projects
          }
          series {
            ts
            total
            projects
          }
          projects {
            id
            name
          }
        }
        builds {
          all {
            total
            projects
            changesDetected
            noChanges
            accepted
            rejected
          }
          series {
            ts
            total
            projects
            changesDetected
            noChanges
            accepted
            rejected
          }
          projects {
            id
            name
          }
        }
      }
    }
  }
`);

export function Component() {
  const params = useAccountParams();
  invariant(params, "must be defined on account");
  const { accountSlug } = params;
  const [searchParams, setSearchParams] = useSearchParams({
    period: DEFAULT_PERIOD,
  });
  const customPeriod = parseCustomPeriod(searchParams);
  const period = parsePeriod(searchParams.get("period"), Boolean(customPeriod));

  const setPeriod = useCallback(
    (value: Period) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_PERIOD) {
          next.delete("period");
        } else {
          next.set("period", value);
        }
        if (value !== "custom") {
          next.delete("from");
          next.delete("to");
        } else {
          const range = parseCustomPeriod(next) ?? getDefaultCustomPeriod();
          next.set("from", getDateQueryValue(range.from));
          next.set("to", getDateQueryValue(range.to));
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setCustomPeriod = useCallback(
    (range: { from: Date; to: Date }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("period", "custom");
        next.set("from", getDateQueryValue(range.from));
        next.set("to", getDateQueryValue(range.to));
        return next;
      });
    },
    [setSearchParams],
  );

  const projectIds = parseProjectIds(searchParams);
  const setProjectIds = useCallback(
    (ids: string[]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (ids.length === 0) {
          next.delete("projects");
        } else {
          next.set("projects", ids.join(","));
        }
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    setPeriod(period);
  }, [setPeriod, period]);

  return (
    <Page>
      <Helmet>
        <title>Analytics • {accountSlug}</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Analytics</Heading>
            <Text slot="headline">
              Track builds and screenshots to monitor your visual testing
              activity at a glance.
            </Text>
          </PageHeaderContent>
          <PageHeaderActions>
            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <ProjectFilter
                  accountSlug={accountSlug}
                  value={projectIds}
                  onChange={setProjectIds}
                />
              </Suspense>
              <PeriodSelect value={period} onChange={setPeriod} />
              {period === "custom" && customPeriod ? (
                <DateRangePicker
                  aria-label="Custom analytics period"
                  granularity="day"
                  value={customPeriod}
                  minValue={today(getLocalTimeZone()).subtract({
                    days: MAX_DURATION_DAYS - 1,
                  })}
                  maxValue={today(getLocalTimeZone())}
                  onChange={(value) => {
                    if (!checkIsDurationValid(value)) {
                      return;
                    }
                    setCustomPeriod(value);
                  }}
                  validate={(value) => {
                    if (!value) {
                      return null;
                    }
                    const range = {
                      from: new Date(`${value.start}T00:00:00`),
                      to: new Date(`${value.end}T00:00:00`),
                    };
                    if (checkIsDurationValid(range)) {
                      return null;
                    }
                    return `Date range cannot exceed ${MAX_DURATION_DAYS} days.`;
                  }}
                />
              ) : null}
            </div>
          </PageHeaderActions>
        </PageHeader>
        <Suspense fallback={<PageLoader />}>
          <Charts
            accountSlug={accountSlug}
            period={period}
            customPeriod={customPeriod}
            projectIds={projectIds}
          />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function Charts(props: {
  accountSlug: string;
  period: Period;
  customPeriod: { from: Date; to: Date } | null;
  projectIds: string[];
}) {
  const { accountSlug, period, customPeriod, projectIds } = props;
  const { from, to, groupBy } = getPeriodSettings(period, customPeriod);

  const { data } = useSuspenseQuery(AccountQuery, {
    variables: {
      slug: accountSlug,
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      projectIds: projectIds.length > 0 ? projectIds : null,
    },
  });

  const metrics = data.account?.metrics;
  if (!metrics) {
    return <Navigate to="/" />;
  }

  return (
    <AnalyticsDashboard
      accountSlug={accountSlug}
      metrics={metrics}
      from={from}
      to={to}
      groupBy={groupBy}
    />
  );
}

type DashboardMetrics = NonNullable<
  NonNullable<AccountUsage_AccountQuery["account"]>["metrics"]
>;

/**
 * The presentational analytics dashboard. Kept free of data fetching so it can
 * be rendered in isolation (e.g. Storybook) with fixture metrics.
 */
export function AnalyticsDashboard(props: {
  accountSlug: string;
  metrics: DashboardMetrics;
  from: Date;
  to: Date;
  groupBy: TimeSeriesGroupBy;
}) {
  const { accountSlug, metrics, from, to, groupBy } = props;
  const concludedBuilds =
    metrics.builds.all.changesDetected + metrics.builds.all.noChanges;
  const reviewedBuilds =
    metrics.builds.all.accepted + metrics.builds.all.rejected;

  const screenshotByBuildSeries: Metric = useMemo(() => {
    const series = metrics.screenshots.series.reduce<Metric["series"]>(
      (acc, serie, index) => {
        const screenshots = serie;
        const builds = metrics.builds.series[index];
        invariant(builds);
        acc.push({
          projects: metrics.screenshots.projects.reduce<Record<string, number>>(
            (acc, project) => {
              const nbScreenshots = screenshots.projects[project.id];
              const nbBuilds = builds.projects[project.id];
              acc[project.id] =
                nbBuilds > 0 ? Math.round(nbScreenshots / nbBuilds) : 0;
              return acc;
            },
            {},
          ),
          total: builds.total
            ? Math.round(screenshots.total / builds.total)
            : 0,
          ts: serie.ts,
        });
        return acc;
      },
      [],
    );
    const all = series.reduce<{
      total: number;
      projects: Record<string, number>;
    }>(
      (acc, serie) => {
        acc.total += serie.total;
        Object.entries(serie.projects).forEach(([projectId, count]) => {
          acc.projects[projectId] = (acc.projects[projectId] ?? 0) + count;
        });
        return acc;
      },
      { total: 0, projects: {} },
    );

    return {
      all,
      projects: metrics.screenshots.projects,
      series,
    };
  }, [metrics]);

  const groupByLabel = GroupByLabels[groupBy].toLowerCase();
  const buildsPerPeriod = metrics.builds.series.length
    ? Math.round(metrics.builds.all.total / metrics.builds.series.length)
    : 0;
  const screenshotsPerPeriod = metrics.screenshots.series.length
    ? Math.round(
        metrics.screenshots.all.total / metrics.screenshots.series.length,
      )
    : 0;
  const screenshotsPerBuild = metrics.builds.all.total
    ? Math.round(metrics.screenshots.all.total / metrics.builds.all.total)
    : 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={LayersIcon}
          color="primary"
          label="Builds"
          value={metrics?.builds.all.total ?? null}
          hint={
            buildsPerPeriod !== null
              ? `${buildsPerPeriod.toLocaleString()} avg / ${groupByLabel}`
              : null
          }
          visual={
            metrics && metrics.builds.all.total > 0 ? (
              <Sparkline
                label="Builds"
                data={metrics.builds.series}
                color="var(--violet-9)"
                groupBy={groupBy}
              />
            ) : null
          }
        />
        <StatTile
          icon={ImagesIcon}
          color="storybook"
          label="Screenshots"
          value={metrics?.screenshots.all.total ?? null}
          hint={
            screenshotsPerPeriod !== null
              ? `${screenshotsPerPeriod.toLocaleString()} avg / ${groupByLabel}`
              : null
          }
          visual={
            metrics && metrics.screenshots.all.total > 0 ? (
              <Sparkline
                label="Screenshots"
                data={metrics.screenshots.series}
                color="var(--pink-9)"
                groupBy={groupBy}
              />
            ) : null
          }
        />
        <StatTile
          icon={GitCompareArrowsIcon}
          color="warning"
          label="Change rate"
          value={
            metrics && concludedBuilds > 0
              ? metrics.builds.all.changesDetected / concludedBuilds
              : metrics
                ? null
                : undefined
          }
          format="percent"
          hint={
            metrics && concludedBuilds > 0
              ? `${metrics.builds.all.changesDetected.toLocaleString()} of ${concludedBuilds.toLocaleString()} builds`
              : "No completed builds yet"
          }
          visual={
            metrics && concludedBuilds > 0 ? (
              <SplitBar
                segments={[
                  {
                    label: "Changes detected",
                    value: metrics.builds.all.changesDetected,
                    color: STATUS_COLORS.changesDetected,
                  },
                  {
                    label: "No changes",
                    value: metrics.builds.all.noChanges,
                    color: STATUS_COLORS.noChanges,
                  },
                ]}
              />
            ) : null
          }
        />
        <StatTile
          icon={ThumbsUpIcon}
          color="success"
          label="Approval rate"
          value={
            metrics && reviewedBuilds > 0
              ? metrics.builds.all.accepted / reviewedBuilds
              : metrics
                ? null
                : undefined
          }
          format="percent"
          hint={
            metrics && reviewedBuilds > 0
              ? `${metrics.builds.all.accepted.toLocaleString()} of ${reviewedBuilds.toLocaleString()} reviewed`
              : "No builds reviewed yet"
          }
          visual={
            metrics && reviewedBuilds > 0 ? (
              <SplitBar
                segments={[
                  {
                    label: "Approved",
                    value: metrics.builds.all.accepted,
                    color: STATUS_COLORS.accepted,
                  },
                  {
                    label: "Rejected",
                    value: metrics.builds.all.rejected,
                    color: STATUS_COLORS.rejected,
                  },
                ]}
              />
            ) : null
          }
        />
      </div>

      <Section
        title="Activity"
        description="How much visual testing ran over the period."
      >
        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Builds"
          description="Builds created, by project."
          action={
            <ExportButton
              isDisabled={!metrics}
              onExport={() => {
                invariant(metrics);
                exportToCSV({
                  metric: metrics.builds,
                  name: getCSVName({
                    account: accountSlug,
                    unit: "builds",
                    from,
                    to,
                    groupBy,
                  }),
                  extraColumns: [
                    {
                      label: "Changes detected",
                      get: (serie) => serie.changesDetected,
                    },
                    { label: "No changes", get: (serie) => serie.noChanges },
                    { label: "Approved", get: (serie) => serie.accepted },
                    { label: "Rejected", get: (serie) => serie.rejected },
                  ],
                });
              }}
            />
          }
        >
          {metrics ? (
            metrics.builds.all.total === 0 ? (
              <EmptyStateBuilds />
            ) : (
              <EvolutionChart
                series={metrics.builds.series}
                keys={getProjectChartKeys(metrics.builds.projects)}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCard>
        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Screenshots"
          description="Screenshots captured, by project."
          action={
            <ExportButton
              isDisabled={!metrics}
              onExport={() => {
                invariant(metrics);
                exportToCSV({
                  metric: metrics.screenshots,
                  name: getCSVName({
                    account: accountSlug,
                    unit: "screenshots",
                    from,
                    to,
                    groupBy,
                  }),
                });
              }}
            />
          }
        >
          {metrics ? (
            metrics.screenshots.all.total === 0 ? (
              <EmptyStateScreenshots />
            ) : (
              <EvolutionChart
                series={metrics.screenshots.series}
                keys={getProjectChartKeys(metrics.screenshots.projects)}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCard>
      </Section>

      <Section
        title="Build outcomes"
        description="What builds concluded, and how reviewers responded."
      >
        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Changes detected"
          description="Completed builds, split by conclusion."
        >
          {metrics ? (
            concludedBuilds === 0 ? (
              <EmptyStateBuilds />
            ) : (
              <EvolutionChart
                series={metrics.builds.series}
                keys={BuildOutcomeChartKeys}
                from={from}
                to={to}
                groupBy={groupBy}
                legend
              />
            )
          ) : null}
        </ChartCard>
        <ChartCard
          className="col-span-12 lg:col-span-6"
          title="Reviewed builds"
          description="Builds with changes, split by review decision."
        >
          {metrics ? (
            reviewedBuilds === 0 ? (
              <EmptyStateReviews />
            ) : (
              <EvolutionChart
                series={metrics.builds.series}
                keys={BuildReviewChartKeys}
                from={from}
                to={to}
                groupBy={groupBy}
                legend
              />
            )
          ) : null}
        </ChartCard>
      </Section>

      <Section
        title="Breakdown"
        description="Where screenshots come from, and how dense each build is."
      >
        <ChartCard
          className="col-span-12 lg:col-span-5"
          title="Screenshots by project"
          description="Share of screenshots across projects."
        >
          {metrics ? (
            metrics.screenshots.all.total > 0 ? (
              <ProjectPieChart metric={metrics.screenshots} />
            ) : (
              <EmptyStateScreenshots />
            )
          ) : null}
        </ChartCard>
        <ChartCard
          className="col-span-12 lg:col-span-7"
          title="Screenshots per build"
          description={
            screenshotsPerBuild !== null
              ? `${screenshotsPerBuild.toLocaleString()} on average across the period.`
              : "Average screenshots captured per build."
          }
        >
          {screenshotByBuildSeries ? (
            screenshotByBuildSeries.all.total === 0 ? (
              <EmptyStateScreenshots />
            ) : (
              <EvolutionChart
                series={screenshotByBuildSeries.series}
                keys={getProjectChartKeys(screenshotByBuildSeries.projects)}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCard>
      </Section>
    </div>
  );
}

function getCSVName(props: {
  account: string;
  unit: string;
  from: Date;
  to: Date;
  groupBy: TimeSeriesGroupBy;
}) {
  const { account, unit, from, to, groupBy } = props;
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  return `${account}-${unit}-${fromStr}-${toStr}-${groupBy}.csv`;
}

function exportToCSV<TSerie extends Metric["series"][number]>(props: {
  metric: Omit<Metric, "series"> & { series: TSerie[] };
  name: string;
  extraColumns?: { label: string; get: (serie: TSerie) => number }[];
}) {
  const { metric, extraColumns = [] } = props;

  const rows: (string | number)[][] = [
    [
      "Date",
      "Total",
      ...metric.projects.map((p) => p.name),
      ...extraColumns.map((column) => column.label),
    ],
  ];

  metric.series.forEach((serie) => {
    const row = [
      new Date(serie.ts).toISOString(),
      serie.total,
      ...metric.projects.map((p) => serie.projects[p.id] ?? 0),
      ...extraColumns.map((column) => column.get(serie)),
    ];
    rows.push(row);
  });

  const csvContent = rows.map((e) => e.join(",")).join("\n");

  // Create the blob and download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = props.name;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function EmptyStateScreenshots() {
  return (
    <EmptyState
      title="No screenshots"
      description="You haven't uploaded any screenshots for this period."
    />
  );
}

function EmptyStateBuilds() {
  return (
    <EmptyState
      title="No builds"
      description="You haven't created any builds for this period."
    />
  );
}

function EmptyStateReviews() {
  return (
    <EmptyState
      title="No reviews"
      description="No builds have been reviewed for this period."
    />
  );
}

// Colors match the build status colors (warning / success / danger).
const STATUS_COLORS = {
  changesDetected: "var(--orange-9)",
  noChanges: "var(--grass-9)",
  accepted: "var(--grass-9)",
  rejected: "var(--tomato-9)",
};

const BuildOutcomeChartKeys: EvolutionChartKey[] = [
  {
    id: "changesDetected",
    label: "Changes detected",
    color: STATUS_COLORS.changesDetected,
  },
  { id: "noChanges", label: "No changes", color: STATUS_COLORS.noChanges },
];

const BuildReviewChartKeys: EvolutionChartKey[] = [
  { id: "rejected", label: "Rejected", color: STATUS_COLORS.rejected },
  { id: "accepted", label: "Approved", color: STATUS_COLORS.accepted },
];

type Metric = {
  all: {
    total: number;
    projects: Record<string, number>;
  };
  projects: { id: string; name: string }[];
  series: {
    ts: number;
    total: number;
    projects: Record<string, number>;
  }[];
};

const StatTileChipStyles: Record<StatTileColor, string> = {
  primary: "bg-primary-ui text-primary-low",
  storybook: "bg-storybook-ui text-storybook-low",
  warning: "bg-warning-ui text-warning-low",
  success: "bg-success-ui text-success-low",
};

type StatTileColor = "primary" | "storybook" | "warning" | "success";

/**
 * A single KPI in the summary band: an icon, a headline value, a supporting
 * line, and an optional inline visual (sparkline or split bar).
 *
 * `value` is `undefined` while loading (skeleton), `null` when there is no
 * meaningful figure to show (rendered as an em dash), otherwise the number.
 */
function StatTile(props: {
  icon: React.ComponentType<{ className?: string }>;
  color: StatTileColor;
  label: string;
  value: number | null | undefined;
  format?: "number" | "percent";
  hint?: React.ReactNode;
  visual?: React.ReactNode;
}) {
  const { icon: Icon, value, format = "number" } = props;
  const isLoading = value === undefined;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <div
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            StatTileChipStyles[props.color],
          )}
        >
          <Icon className="size-4" />
        </div>
        <span className="text-low text-sm font-medium">{props.label}</span>
      </div>
      <div>
        <div className="relative text-3xl leading-none font-black tabular-nums">
          {value === undefined ? (
            <div className="bg-subtle h-[1em] w-24 rounded-sm" />
          ) : value === null ? (
            <span className="text-low">—</span>
          ) : format === "percent" ? (
            <NumberFlow
              value={value}
              format={{ style: "percent", maximumFractionDigits: 0 }}
            />
          ) : (
            <NumberFlow value={value} />
          )}
        </div>
        {props.hint ? (
          <p className="text-low mt-0.5 h-4 text-sm">
            {isLoading ? null : props.hint}
          </p>
        ) : null}
      </div>
      {props.visual ? <div className="mt-auto">{props.visual}</div> : null}
    </Card>
  );
}

function Sparkline(props: {
  label: string;
  data: { ts: number; total: number }[];
  color: string;
  groupBy: TimeSeriesGroupBy;
}) {
  const { groupBy } = props;
  const gradientId = useId();
  return (
    <div className="h-9 w-full">
      <ChartContainer
        config={{ total: { label: props.label } }}
        className="size-full"
      >
        <AreaChart
          data={props.data}
          margin={{ top: 2, bottom: 0, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={props.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={props.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <ChartTooltip
            isAnimationActive={false}
            cursor={{ strokeDasharray: "3 3" }}
            position={{ y: -56 }}
            allowEscapeViewBox={{ y: true }}
            content={
              <ChartTooltipContent
                color={props.color}
                labelFormatter={(_value, payload) => {
                  const firstItem = payload[0];
                  invariant(firstItem, "payload[0] is undefined");
                  return formatSeriesDateLabel(firstItem.payload.ts, groupBy);
                }}
              />
            }
          />
          <Area
            dataKey="total"
            type="monotone"
            stroke={props.color}
            strokeWidth={1}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function SplitBar(props: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = props.segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <Tooltip
      delay={150}
      placement="top"
      disableAnimation
      content={
        <div className="flex min-w-40 flex-col gap-1 py-0.5">
          {props.segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-1.5">
              <div
                className="size-2 shrink-0 rounded-xs"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-low">{segment.label}</span>
              <span className="ml-auto font-medium tabular-nums">
                {segment.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      }
    >
      {/* Padding enlarges the hover target beyond the 6px bar. */}
      <div className="-my-1.5 w-full cursor-default py-1.5">
        <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
          {props.segments.map((segment) =>
            segment.value > 0 ? (
              <div
                key={segment.label}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(segment.value / total) * 100}%`,
                  backgroundColor: segment.color,
                }}
                aria-label={`${segment.label}: ${segment.value}`}
              />
            ) : null,
          )}
        </div>
      </div>
    </Tooltip>
  );
}

/**
 * A titled group of chart cards laid out on a 12-column grid.
 */
function Section(props: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{props.title}</h2>
        <p className="text-low text-sm">{props.description}</p>
      </div>
      <div className="grid grid-cols-12 gap-6">{props.children}</div>
    </section>
  );
}

function ChartCard(props: {
  className?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className={clsx("flex flex-col", props.className)}>
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div>
          <h3 className="font-semibold">{props.title}</h3>
          {props.description ? (
            <p className="text-low text-sm">{props.description}</p>
          ) : null}
        </div>
        {props.action ? <div className="shrink-0">{props.action}</div> : null}
      </div>
      <div className="flex min-h-72 flex-1 items-center justify-center p-5">
        {props.children}
      </div>
    </Card>
  );
}

function ExportButton(props: { isDisabled: boolean; onExport: () => void }) {
  return (
    <Tooltip content="Export to CSV">
      <IconButton isDisabled={props.isDisabled} onPress={props.onExport}>
        <FileDownIcon />
      </IconButton>
    </Tooltip>
  );
}

function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="font-medium">{props.title}</div>
      <p className="text-low text-sm">{props.description}</p>
    </div>
  );
}

function ProjectPieChart(props: { metric: Metric }) {
  const data = props.metric.projects.reduce<
    { project: string; screenshots: number; fill: string }[]
  >((acc, project, index) => {
    const screenshots = props.metric.all.projects[project.id];
    invariant(typeof screenshots === "number");
    acc.push({
      project: project.name,
      screenshots,
      fill: getChartColorFromIndex(index),
    });
    return acc;
  }, []);
  return (
    <div className="flex size-full flex-col">
      {/* The legend lives outside the SVG: when it participates in the
          chart layout, the pie ring shifts up but the center label viewBox
          does not, leaving the label off-center. */}
      <ChartContainer config={{}} className="min-h-0 flex-1">
        <PieChart>
          <Pie
            data={data}
            dataKey="screenshots"
            nameKey="project"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            strokeWidth={2}
            isAnimationActive={false}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null;
                }
                const cx = Number(viewBox.cx);
                const cy = Number(viewBox.cy);
                return (
                  <text x={cx} y={cy} textAnchor="middle">
                    <tspan
                      x={cx}
                      y={cy - 4}
                      className="fill-(--text-color-default) text-2xl font-black tabular-nums"
                    >
                      {props.metric.all.total.toLocaleString(
                        navigator.language,
                        { notation: "compact" },
                      )}
                    </tspan>
                    <tspan
                      x={cx}
                      y={cy + 14}
                      className="fill-(--text-color-low) text-xs"
                    >
                      screenshots
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-2 pt-3 text-xs">
        {props.metric.projects.map((project, index) => (
          <div key={project.id}>
            <div className="flex items-center gap-1.5">
              <div
                className="size-2 shrink-0 rounded-xs"
                style={{ backgroundColor: getChartColorFromIndex(index) }}
              />
              {project.name}
            </div>
            <div className="mt-1 text-base font-bold tabular-nums">
              {props.metric.all.projects[project.id]?.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type EvolutionChartKey = {
  id: string;
  label: string;
  color: string;
};

function getProjectChartKeys(
  projects: { id: string; name: string }[],
): EvolutionChartKey[] {
  return projects.map((project, index) => ({
    id: `projects.${project.id}`,
    label: project.name,
    color: getChartColorFromIndex(index),
  }));
}

function EvolutionChart(props: {
  series: { ts: number }[];
  keys: EvolutionChartKey[];
  from: Date;
  to: Date;
  groupBy: TimeSeriesGroupBy;
  legend?: boolean;
}) {
  const { series, keys, from, to, groupBy } = props;
  const chartConfig = keys.reduce<ChartConfig>((config, key) => {
    config[key.id] = {
      label: key.label,
    };
    return config;
  }, {});
  const ticks = useMemo(() => {
    switch (groupBy) {
      case TimeSeriesGroupBy.Day:
        return getTimeTicks(from, to, "day", 4);
      case TimeSeriesGroupBy.Week:
        return getTimeTicks(from, to, "week");
      case TimeSeriesGroupBy.Month:
        return getTimeTicks(from, to, "month");
    }
  }, [from, to, groupBy]);
  return (
    <ChartContainer config={chartConfig} className="h-full md:flex-1">
      <AreaChart
        margin={{ left: -12, right: 12 }}
        accessibilityLayer
        data={series}
        syncId="evolution"
      >
        <CartesianGrid vertical={false} strokeDasharray="5 5" />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => {
            return value.toLocaleString(navigator.language, {
              notation: "compact",
            });
          }}
        />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          tickLine={false}
          axisLine={false}
          minTickGap={0}
          tickMargin={12}
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tickFormatter={(value) => {
            const date = new Date(value);
            switch (groupBy) {
              case TimeSeriesGroupBy.Day:
              case TimeSeriesGroupBy.Week: {
                return date.toLocaleDateString(navigator.language, {
                  month: "short",
                  day: "numeric",
                });
              }
              case TimeSeriesGroupBy.Month:
                return date.toLocaleDateString(navigator.language, {
                  month: "short",
                });
            }
          }}
        />
        <ChartTooltip
          isAnimationActive={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => {
                const firstItem = payload[0];
                invariant(firstItem, "payload[0] is undefined");
                return formatSeriesDateLabel(firstItem.payload.ts, groupBy);
              }}
            />
          }
        />
        {props.legend ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {keys.map((key) => {
          return (
            <Area
              key={key.id}
              dataKey={key.id}
              type="monotone"
              fill={key.color}
              fillOpacity={0.4}
              stroke={key.color}
              stackId="group"
              isAnimationActive={false}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}

type PresetPeriod =
  "last-7-days" | "last-30-days" | "last-90-days" | "last-365-days";
type Period = PresetPeriod | "custom";

const Periods: Record<
  PresetPeriod,
  { days: number; groupBy: TimeSeriesGroupBy }
> = {
  "last-7-days": {
    days: 7,
    groupBy: TimeSeriesGroupBy.Day,
  },
  "last-30-days": {
    days: 30,
    groupBy: TimeSeriesGroupBy.Day,
  },
  "last-90-days": {
    days: 90,
    groupBy: TimeSeriesGroupBy.Week,
  },
  "last-365-days": {
    days: 365,
    groupBy: TimeSeriesGroupBy.Month,
  },
};

const MAX_DURATION_DAYS = 365;
const DEFAULT_PERIOD: PresetPeriod = "last-30-days";

function parsePeriod(value: string | null, hasCustomPeriod: boolean): Period {
  switch (value) {
    case "last-7-days":
    case "last-30-days":
    case "last-90-days":
    case "last-365-days":
      return value;
    case "custom":
      return hasCustomPeriod ? value : DEFAULT_PERIOD;
    default:
      return DEFAULT_PERIOD;
  }
}

const PeriodLabels: Record<Period, string> = {
  "last-7-days": "Last 7 days",
  "last-30-days": "Last 30 days",
  "last-90-days": "Last 90 days",
  "last-365-days": "Last 365 days",
  custom: "Custom",
};

const GroupByLabels: Record<TimeSeriesGroupBy, string> = {
  [TimeSeriesGroupBy.Day]: "Day",
  [TimeSeriesGroupBy.Week]: "Week",
  [TimeSeriesGroupBy.Month]: "Month",
};

function formatSeriesDateLabel(ts: number, groupBy: TimeSeriesGroupBy) {
  const date = new Date(ts);
  switch (groupBy) {
    case TimeSeriesGroupBy.Day:
      return date.toLocaleDateString(navigator.language, {
        month: "short",
        day: "numeric",
      });
    case TimeSeriesGroupBy.Week: {
      const startOfWeek = moment(date).startOf("week").format("MMM D");
      const endOfWeek = moment(date).endOf("week").format("MMM D");
      return `${startOfWeek} - ${endOfWeek}`;
    }
    case TimeSeriesGroupBy.Month:
      return date.toLocaleDateString(navigator.language, {
        month: "short",
      });
  }
}

const ProjectsQuery = graphql(`
  query AccountAnalyticsProjects_account($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 100, after: 0) {
        edges {
          id
          name
        }
      }
    }
  }
`);

function parseProjectIds(searchParams: URLSearchParams): string[] {
  const value = searchParams.get("projects");
  if (!value) {
    return [];
  }
  return value.split(",").filter(Boolean);
}

function ProjectFilter(props: {
  accountSlug: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { data } = useSuspenseQuery(ProjectsQuery, {
    variables: { slug: props.accountSlug },
  });
  const projects = data.account?.projects.edges ?? [];
  if (projects.length < 2) {
    return null;
  }
  return (
    <ProjectFilterMenu
      projects={projects}
      value={props.value}
      onChange={props.onChange}
    />
  );
}

/**
 * Number of projects above which the project filter shows a search field.
 */
const PROJECT_SEARCH_THRESHOLD = 5;

/**
 * The project filter UI, decoupled from data fetching so it can be rendered
 * in isolation (e.g. Storybook).
 */
export function ProjectFilterMenu(props: {
  projects: { id: string; name: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { contains } = useFilter({ sensitivity: "base" });
  const projects = [...props.projects].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const selected = props.value.filter((id) =>
    projects.some((project) => project.id === id),
  );
  const label =
    selected.length === 0
      ? "All projects"
      : selected.length === 1
        ? projects.find((project) => project.id === selected[0])?.name
        : `${selected.length} projects`;
  const searchable = projects.length > PROJECT_SEARCH_THRESHOLD;
  const menu = (
    <Menu
      aria-label="Projects"
      selectionMode="multiple"
      selectedKeys={selected}
      className={searchable ? "max-h-72" : undefined}
      renderEmptyState={() => (
        <div className="text-low px-3 py-1.5 text-sm">No projects found</div>
      )}
      onSelectionChange={(keys) => {
        if (keys === "all") {
          return;
        }
        props.onChange(
          projects
            .filter((project) => keys.has(project.id))
            .map((project) => project.id),
        );
      }}
    >
      {projects.map((project) => (
        <MenuItem key={project.id} id={project.id} textValue={project.name}>
          {project.name}
        </MenuItem>
      ))}
    </Menu>
  );
  return (
    <MenuTrigger>
      <SelectButton className="shrink-0 text-sm whitespace-nowrap">
        {label}
        {selected.length > 1 ? (
          <Badge>
            {selected.length}/{projects.length}
          </Badge>
        ) : null}
      </SelectButton>
      <Popover>
        {searchable ? (
          <Autocomplete filter={contains}>
            <div className="flex w-56 flex-col">
              <SearchField
                aria-label="Search projects"
                autoFocus
                className="flex items-center gap-2 border-b px-3 py-2"
              >
                <SearchIcon className="text-low size-4 shrink-0" />
                <Input
                  placeholder="Search projects…"
                  className="placeholder:text-placeholder search-cancel:hidden w-full bg-transparent text-sm outline-hidden"
                />
              </SearchField>
              {menu}
            </div>
          </Autocomplete>
        ) : (
          menu
        )}
      </Popover>
    </MenuTrigger>
  );
}

function PeriodSelect(props: {
  value: Period;
  onChange: (value: Period) => void;
}) {
  return (
    <Select
      aria-label="Levels"
      value={props.value}
      onChange={(value) => props.onChange(value as Period)}
    >
      <SelectButton className="w-full shrink-0 text-sm whitespace-nowrap">
        {PeriodLabels[props.value]}
      </SelectButton>
      <Popover>
        <ListBox>
          {Object.entries(PeriodLabels).map(([key, label]) => {
            return (
              <ListBoxItem key={key} id={key} textValue={key}>
                <ListBoxItemLabel>{label}</ListBoxItemLabel>
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </Select>
  );
}

function getDateQueryValue(date: Date): string {
  return moment(date).format("YYYY-MM-DD");
}

function parseDateQueryValue(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = moment(value, "YYYY-MM-DD", true);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.startOf("day").toDate();
}

function getDurationInDays(range: { from: Date; to: Date }) {
  return moment(range.to).diff(moment(range.from), "days") + 1;
}

function checkIsDurationValid(range: { from: Date; to: Date }) {
  if (range.from > range.to) {
    return false;
  }
  return getDurationInDays(range) <= MAX_DURATION_DAYS;
}

function getDefaultCustomPeriod() {
  const now = moment();
  return {
    from: now.clone().startOf("day").subtract(30, "days").toDate(),
    to: now.clone().startOf("day").toDate(),
  };
}

function parseCustomPeriod(searchParams: URLSearchParams) {
  const from = parseDateQueryValue(searchParams.get("from"));
  const to = parseDateQueryValue(searchParams.get("to"));
  if (!from || !to) {
    return null;
  }
  const range = { from, to };
  if (!checkIsDurationValid(range)) {
    return null;
  }
  return range;
}

function getPeriodSettings(
  period: Period,
  customPeriod: { from: Date; to: Date } | null,
) {
  if (period === "custom") {
    const range = customPeriod ?? getDefaultCustomPeriod();
    return {
      from: moment(range.from).startOf("day").toDate(),
      to: moment(range.to).endOf("day").toDate(),
      groupBy:
        getDurationInDays(range) <= 30
          ? TimeSeriesGroupBy.Day
          : getDurationInDays(range) <= 90
            ? TimeSeriesGroupBy.Week
            : TimeSeriesGroupBy.Month,
    };
  }

  const today = moment().startOf("day");
  return {
    from: today.clone().subtract(Periods[period].days, "days").toDate(),
    to: today.clone().endOf("day").toDate(),
    groupBy: Periods[period].groupBy,
  };
}
