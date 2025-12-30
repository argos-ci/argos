import { useMemo } from "react";
import { invariant } from "@argos/util/invariant";
import { useDateFormatter } from "react-aria";
import { Bar, ComposedChart, XAxis, YAxis } from "recharts";

import type { TestMetricDataPoint } from "@/gql/graphql";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  getTimeTicks,
  type ChartConfig,
} from "@/ui/Charts";

const chartConfig = {
  changes: {
    label: "Changes",
  },
  uniqueChanges: {
    label: "One-off changes",
  },
  nonUniqueChanges: {
    label: "Repeated changes",
  },
  total: {
    label: "Builds",
  },
} satisfies ChartConfig;

function getTicksFromBoundaries(from: Date, to?: Date) {
  to = to ?? new Date();
  const diff = to.getTime() - from.getTime();
  if (diff <= 24 * 60 * 60 * 1000) {
    return getTimeTicks(from, to, "hour", 6);
  }
  if (diff <= 3 * 24 * 60 * 60 * 1000) {
    return getTimeTicks(from, to, "day", 1);
  }
  if (diff <= 7 * 24 * 60 * 60 * 1000) {
    return getTimeTicks(from, to, "day", 2);
  }
  if (diff <= 14 * 24 * 60 * 60 * 1000) {
    return getTimeTicks(from, to, "day", 4);
  }
  if (diff <= 31 * 24 * 60 * 60 * 1000) {
    return getTimeTicks(from, to, "day", 7);
  }
  return getTimeTicks(from, to, "day", 30);
}

export function ChangesChart(props: {
  series: TestMetricDataPoint[];
  from: Date;
  className?: string;
}) {
  const { series, from, className } = props;
  const tickFormatter = useDateFormatter({
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const ticks = useMemo(() => getTicksFromBoundaries(from), [from]);
  const transformedSeries = useMemo(() => {
    return series.map((item) => ({
      ...item,
      nonUniqueChanges: item.changes - item.uniqueChanges,
    }));
  }, [series]);
  return (
    <ChartContainer config={chartConfig} className={className}>
      <ComposedChart data={transformedSeries}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => {
                const firstItem = payload[0];
                invariant(firstItem, "payload[0] is undefined");
                const start = new Date(firstItem.payload.ts);
                const end = new Date(start.getTime() + 12 * 60 * 60 * 1000); // +12h

                const datePart = start.toLocaleDateString(navigator.language, {
                  month: "short",
                  day: "numeric",
                });

                const startTime = start.toLocaleTimeString(navigator.language, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                const endTime = end.toLocaleTimeString(navigator.language, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                const timeZone = Intl.DateTimeFormat(navigator.language, {
                  timeZoneName: "short",
                })
                  .format(start)
                  .split(" ")
                  .pop(); // Gets "CET" or similar

                return `${datePart} ${startTime} – ${endTime} (${timeZone})`;
              }}
            />
          }
        />

        <Bar
          dataKey="total"
          xAxisId="total"
          type="monotone"
          fill="var(--mauve-7)"
          stroke=""
        />
        <Bar
          dataKey="uniqueChanges"
          xAxisId="changes"
          stackId="changes"
          fill="var(--blue-10)"
        />
        <Bar
          dataKey="nonUniqueChanges"
          xAxisId="changes"
          stackId="changes"
          fill="var(--amber-10)"
        />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={["auto", "auto"]}
          padding={{ left: 8 }}
          ticks={ticks}
          tickFormatter={(value) => tickFormatter.format(new Date(value))}
          height={14}
        />
        <YAxis
          dataKey="total"
          type="number"
          domain={["dataMin", "dataMax"]}
          width={24}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
