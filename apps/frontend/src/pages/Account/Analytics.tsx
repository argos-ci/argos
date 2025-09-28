import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { FileDownIcon } from "lucide-react";
import moment from "moment";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { graphql } from "@/gql";
import { TimeSeriesGroupBy } from "@/gql/graphql";
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
import { IconButton } from "@/ui/IconButton";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { PageLoader } from "@/ui/PageLoader";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { Tooltip } from "@/ui/Tooltip";

const AccountQuery = graphql(`
  query AccountUsage_account(
    $slug: String!
    $from: DateTime!
    $groupBy: TimeSeriesGroupBy!
  ) {
    account(slug: $slug) {
      id
      permissions
      metrics(input: { from: $from, groupBy: $groupBy }) {
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
      }
    }
  }
`);

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  invariant(accountSlug);
  const [params, setParams] = useSearchParams({ period: DEFAULT_PERIOD });
  const period = parsePeriod(params.get("period"));

  const setPeriod = useCallback(
    (value: Period) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_PERIOD) {
          next.delete("period");
        } else {
          next.set("period", value);
        }
        return next;
      });
    },
    [setParams],
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
            <PeriodSelect value={period} onChange={setPeriod} />
          </PageHeaderActions>
        </PageHeader>
        <Suspense fallback={<PageLoader />}>
          <Charts accountSlug={accountSlug} period={period} />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function Charts(props: { accountSlug: string; period: Period }) {
  const { accountSlug, period } = props;
  const { from, to, groupBy } = Periods[period];

  const { data } = useSuspenseQuery(AccountQuery, {
    variables: {
      slug: accountSlug,
      from: from.toISOString(),
      groupBy,
    },
  });

  const metrics = data.account?.metrics;

  const screenshotByBuildSeries: Metric | null = useMemo(() => {
    if (!metrics) {
      return null;
    }

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

  if (data && !metrics) {
    return <Navigate to="/" />;
  }

  return (
    <div className="grid grid-cols-12 gap-6 lg:flex-row">
      <Card className="group col-span-12 flex flex-col lg:col-span-6">
        <ChartCardHeader className="flex items-start justify-between gap-6">
          <div>
            <ChartCardDescription>Builds</ChartCardDescription>
            <Count count={metrics?.builds.all.total ?? null} />
          </div>
          <Tooltip content="Export to CSV">
            <IconButton
              isDisabled={!metrics}
              onPress={() => {
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
                });
              }}
            >
              <FileDownIcon />
            </IconButton>
          </Tooltip>
        </ChartCardHeader>
        <ChartCardBody>
          {metrics?.builds ? (
            metrics.builds.all.total === 0 ? (
              <EmptyStateBuilds />
            ) : (
              <EvolutionChart
                metric={metrics.builds}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCardBody>
      </Card>
      <Card className="col-span-12 flex flex-col lg:col-span-6">
        <ChartCardHeader className="flex items-start justify-between gap-6">
          <div>
            <ChartCardDescription>Screenshots</ChartCardDescription>
            <Count count={metrics?.screenshots.all.total ?? null} />
          </div>
          <Tooltip content="Export to CSV">
            <IconButton
              isDisabled={!metrics}
              onPress={() => {
                invariant(metrics);
                exportToCSV({
                  metric: metrics.builds,
                  name: getCSVName({
                    account: accountSlug,
                    unit: "screenshots",
                    from,
                    to,
                    groupBy,
                  }),
                });
              }}
            >
              <FileDownIcon />
            </IconButton>
          </Tooltip>
        </ChartCardHeader>
        <ChartCardBody>
          {metrics ? (
            metrics.screenshots.all.total === 0 ? (
              <EmptyStateScreenshots />
            ) : (
              <EvolutionChart
                metric={metrics.screenshots}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCardBody>
      </Card>
      <Card className="col-span-12 flex flex-col lg:col-span-4">
        <ChartCardHeader>
          <ChartCardHeading>Screenshots by Project</ChartCardHeading>
        </ChartCardHeader>
        <ChartCardBody>
          {metrics ? (
            metrics.screenshots.all.total > 0 ? (
              <ProjectPieChart metric={metrics.screenshots} />
            ) : (
              <EmptyStateScreenshots />
            )
          ) : null}
        </ChartCardBody>
      </Card>
      <div className="col-span-12 flex flex-col gap-[inherit] lg:col-span-3">
        <Card className="p-6">
          <ChartCardHeading className="mb-4">
            Usage by {GroupByLabels[groupBy]}
          </ChartCardHeading>
          <div className="flex flex-col gap-4">
            <div>
              <ChartCardDescription>Builds</ChartCardDescription>
              <Count
                count={
                  metrics
                    ? Math.round(
                        metrics.builds.all.total / metrics.builds.series.length,
                      )
                    : null
                }
              />
            </div>
            <div>
              <ChartCardDescription>Screenshots</ChartCardDescription>
              <Count
                count={
                  metrics
                    ? Math.round(
                        metrics.screenshots.all.total /
                          metrics.screenshots.series.length,
                      )
                    : null
                }
              />
            </div>
          </div>
        </Card>
      </div>
      <Card className="col-span-12 flex flex-col lg:col-span-5">
        <ChartCardHeader>
          <ChartCardHeading className="mb-4">
            Screenshots by Build
          </ChartCardHeading>
          <ChartCardDescription>Screenshots</ChartCardDescription>
          <Count
            count={
              metrics
                ? metrics.screenshots.all.total
                  ? Math.round(
                      metrics.screenshots.all.total / metrics.builds.all.total,
                    )
                  : 0
                : null
            }
          />
        </ChartCardHeader>
        <ChartCardBody>
          {screenshotByBuildSeries ? (
            screenshotByBuildSeries.all.total === 0 ? (
              <EmptyStateScreenshots />
            ) : (
              <EvolutionChart
                metric={screenshotByBuildSeries}
                from={from}
                to={to}
                groupBy={groupBy}
              />
            )
          ) : null}
        </ChartCardBody>
      </Card>
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

function exportToCSV(props: { metric: Metric; name: string }) {
  const { metric } = props;

  const rows: (string | number)[][] = [
    ["Date", "Total", ...metric.projects.map((p) => p.name)],
  ];

  metric.series.forEach((serie) => {
    const row = [
      new Date(serie.ts).toISOString(),
      serie.total,
      ...metric.projects.map((p) => serie.projects[p.id] ?? 0),
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

function ChartCardHeader(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("p-6", props.className)}>{props.children}</div>;
}

function Count(props: { count: number | null }) {
  const isLoading = props.count === null;
  return (
    <div className="relative text-4xl font-black">
      <NumberFlow
        value={props.count ?? 0}
        className={isLoading ? "invisible" : undefined}
      />

      {isLoading && (
        <div className="bg-subtle absolute left-0 top-2 h-[1em] w-32 rounded-sm" />
      )}
    </div>
  );
}

function ChartCardHeading(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={clsx("text-2xl font-bold", props.className)}>
      {props.children}
    </h2>
  );
}

function ChartCardDescription(props: { children: React.ReactNode }) {
  return <p className="text-low text-sm font-medium">{props.children}</p>;
}

function ChartCardBody(props: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-80 flex-1 items-center justify-center p-6 pt-0">
      {props.children}
    </div>
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
  const chartConfig = props.metric.projects.reduce<ChartConfig>(
    (config, project, index) => {
      config[project.name] = {
        label: project.name,
        count: props.metric.all.projects[project.id],
        color: getChartColorFromIndex(index),
      };
      return config;
    },
    { screenshots: { label: "Screenshots" } },
  );
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
    <ChartContainer config={chartConfig} className="size-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie data={data} dataKey="screenshots" nameKey="project" />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}

function EvolutionChart(props: {
  metric: Metric;
  from: Date;
  to: Date;
  groupBy: TimeSeriesGroupBy;
}) {
  const { metric, from, to, groupBy } = props;
  const chartConfig = metric.projects.reduce<ChartConfig>((config, project) => {
    config[`projects.${project.id}`] = {
      label: project.name,
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
        data={metric.series}
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
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => {
                const firstItem = payload[0];
                invariant(firstItem, "payload[0] is undefined");
                const date = new Date(firstItem.payload.ts);
                switch (groupBy) {
                  case TimeSeriesGroupBy.Day:
                    return date.toLocaleDateString(navigator.language, {
                      month: "short",
                      day: "numeric",
                    });
                  case TimeSeriesGroupBy.Week: {
                    const startOfWeek = moment(date)
                      .startOf("week")
                      .format("MMM D");
                    const endOfWeek = moment(date)
                      .endOf("week")
                      .format("MMM D");
                    return `${startOfWeek} - ${endOfWeek}`;
                  }
                  case TimeSeriesGroupBy.Month:
                    return date.toLocaleDateString(navigator.language, {
                      month: "short",
                    });
                }
              }}
            />
          }
        />
        {metric.projects.map((project, index) => {
          const color = getChartColorFromIndex(index);
          return (
            <Area
              key={project.id}
              dataKey={`projects.${project.id}`}
              type="monotone"
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              stackId="group"
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}

type Period = "last-7-days" | "last-30-days" | "last-90-days" | "last-365-days";

const Periods: Record<
  Period,
  { from: Date; to: Date; groupBy: TimeSeriesGroupBy }
> = {
  "last-7-days": {
    from: moment().startOf("day").subtract(7, "days").toDate(),
    to: new Date(),
    groupBy: TimeSeriesGroupBy.Day,
  },
  "last-30-days": {
    from: moment().startOf("day").subtract(30, "days").toDate(),
    to: new Date(),
    groupBy: TimeSeriesGroupBy.Day,
  },
  "last-90-days": {
    from: moment().startOf("day").subtract(90, "days").toDate(),
    to: new Date(),
    groupBy: TimeSeriesGroupBy.Week,
  },
  "last-365-days": {
    from: moment().startOf("day").subtract(365, "days").toDate(),
    to: new Date(),
    groupBy: TimeSeriesGroupBy.Month,
  },
};

const DEFAULT_PERIOD: Period = "last-30-days";

function parsePeriod(value: string | null): Period {
  switch (value) {
    case "last-7-days":
    case "last-30-days":
    case "last-90-days":
    case "last-365-days":
      return value;
    default:
      return DEFAULT_PERIOD;
  }
}

const PeriodLabels: Record<Period, string> = {
  "last-7-days": "Last 7 days",
  "last-30-days": "Last 30 days",
  "last-90-days": "Last 90 days",
  "last-365-days": "Last 365 days",
};

const GroupByLabels: Record<TimeSeriesGroupBy, string> = {
  [TimeSeriesGroupBy.Day]: "Day",
  [TimeSeriesGroupBy.Week]: "Week",
  [TimeSeriesGroupBy.Month]: "Month",
};

function PeriodSelect(props: {
  value: Period;
  onChange: (value: Period) => void;
}) {
  return (
    <Select
      aria-label="Levels"
      selectedKey={props.value}
      onSelectionChange={(value) => props.onChange(value as Period)}
    >
      <SelectButton className="w-full text-sm">
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
