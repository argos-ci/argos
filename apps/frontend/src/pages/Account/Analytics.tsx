import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { CloudOffIcon } from "lucide-react";
import moment from "moment";
import { Helmet } from "react-helmet";
import { useParams, useSearchParams } from "react-router-dom";
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

import { DocumentType, graphql } from "@/gql";
import { TimeSeriesGroupBy } from "@/gql/graphql";
import { Card } from "@/ui/Card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  getChartColorFromIndex,
} from "@/ui/Charts";
import { Container } from "@/ui/Container";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Loader } from "@/ui/Loader";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { Heading } from "@/ui/Typography";

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
`);

type Account = NonNullable<DocumentType<typeof AccountQuery>["account"]>;

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  invariant(accountSlug);
  const [params, setParams] = useSearchParams({ period: "last-365-days" });
  const period = parsePeriod(params.get("period"));

  const setPeriod = useCallback(
    (value: Period) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "last-365-days") {
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
    <Container className="py-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Heading margin={false}>Analytics</Heading>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>
      <Helmet>
        <title>{accountSlug} • Analytics</title>
      </Helmet>
      <Suspense fallback={<Loader />}>
        <Charts accountSlug={accountSlug} period={period} />
      </Suspense>
    </Container>
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
  const { account } = data;

  if (!account) {
    throw new Error("No data");
  }

  return (
    <Card className="flex flex-col">
      <div className="flex border-b">
        <div className="min-w-52 p-6">
          <h2 className="font-medium">Screenshots</h2>
          <p className="text-sm">
            The number of screenshots uploaded to Argos.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        {account.metrics.all.total === 0 ? (
          <div className="flex flex-col items-center gap-2">
            <CloudOffIcon
              className="size-20"
              strokeWidth={0.8}
              absoluteStrokeWidth
            />
            <div className="font-medium">No screenshots</div>
            <p className="text-low text-sm">
              You haven't taken any screenshots for this period.
            </p>
          </div>
        ) : (
          <div className="flex size-full flex-col gap-6 pt-6 md:flex-row">
            <EvolutionChart
              account={account}
              from={from}
              to={to}
              groupBy={groupBy}
            />
            <ProjectsDistributionChart account={account} />
          </div>
        )}
      </div>
    </Card>
  );
}

function EvolutionChart(props: {
  account: Account;
  from: Date;
  to: Date;
  groupBy: TimeSeriesGroupBy;
}) {
  const { account, from, to, groupBy } = props;
  const chartConfig = account.metrics.projects.reduce<ChartConfig>(
    (config, project) => {
      config[`projects.${project.id}`] = {
        label: project.name,
      };
      return config;
    },
    {
      screenshots: {
        label: "Screenshots",
      },
    },
  );
  const ticks = useMemo(() => {
    switch (groupBy) {
      case TimeSeriesGroupBy.Day:
        return getTicks(from, to, "day", 4);
      case TimeSeriesGroupBy.Week:
        return getTicks(from, to, "week");
      case TimeSeriesGroupBy.Month:
        return getTicks(from, to, "month");
    }
  }, [from, to, groupBy]);
  return (
    <ChartContainer config={chartConfig} className="h-80 md:flex-1">
      <AreaChart
        margin={{ left: 12, right: 12 }}
        accessibilityLayer
        data={account.metrics.series}
      >
        <CartesianGrid vertical={false} strokeDasharray="5 5" />
        <YAxis tickLine={false} axisLine={false} />
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
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
              case TimeSeriesGroupBy.Month:
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
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
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
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
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    });
                }
              }}
            />
          }
        />
        {account.metrics.projects.map((project, index) => {
          const color = getChartColorFromIndex(index);
          return (
            <Area
              key={project.id}
              dataKey={`projects.${project.id}`}
              type="monotone"
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              stackId="screenshots"
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}

function ProjectsDistributionChart(props: { account: Account }) {
  const { account } = props;
  const chartConfig = account.metrics.projects.reduce<ChartConfig>(
    (config, project, index) => {
      config[project.name] = {
        label: project.name,
        color: getChartColorFromIndex(index),
      };
      return config;
    },
    { screenshots: { label: "Screenshots" } },
  );

  const data = account.metrics.projects.reduce<
    { project: string; screenshots: number; fill: string }[]
  >((acc, project, index) => {
    acc.push({
      project: project.name,
      screenshots: account.metrics.all.projects[project.id],
      fill: getChartColorFromIndex(index),
    });
    return acc;
  }, []);

  return (
    <ChartContainer config={chartConfig} className="mx-auto size-80">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="screenshots"
          nameKey="project"
          innerRadius={60}
          strokeWidth={5}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-text-default text-xl font-medium"
                    >
                      {account.metrics.all.total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-text-low text-xs"
                    >
                      screenshots
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function getTicks(
  from: Date,
  to: Date,
  unit: moment.unitOfTime.Base,
  step = 1,
) {
  const ticks = [];
  const current = moment(from).add(1, unit).startOf(unit);
  while (current.isBefore(to)) {
    ticks.push(current.toDate().getTime());
    current.add(step, unit);
  }
  return ticks;
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

function parsePeriod(value: string | null): Period {
  switch (value) {
    case "last-7-days":
    case "last-30-days":
    case "last-90-days":
    case "last-365-days":
      return value;
    default:
      return "last-365-days";
  }
}

const PeriodLabels: Record<Period, string> = {
  "last-7-days": "Last week",
  "last-30-days": "Last month",
  "last-90-days": "Last 3 months",
  "last-365-days": "Last year",
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
      <SelectButton className="text-low w-full text-sm">
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
