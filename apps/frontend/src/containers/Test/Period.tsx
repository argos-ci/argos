import { addDays, addHours, startOfDay } from "@argos/util/date";

import { MetricsPeriod } from "@/gql/graphql";

import {
  usePeriodState,
  type PeriodsDefinition,
  type PeriodState,
} from "../PeriodSelect";

const now = new Date();

const TEST_METRICS_PERIOD = {
  [MetricsPeriod.Last_24Hours]: {
    from: addHours(now, -24),
    label: "Last 24 hours",
  },
  [MetricsPeriod.Last_3Days]: {
    from: startOfDay(addDays(now, -3)),
    label: "Last 3 days",
  },
  [MetricsPeriod.Last_7Days]: {
    from: startOfDay(addDays(now, -7)),
    label: "Last 7 days",
  },
  [MetricsPeriod.Last_30Days]: {
    from: startOfDay(addDays(now, -30)),
    label: "Last 30 days",
  },
  [MetricsPeriod.Last_90Days]: {
    from: startOfDay(addDays(now, -90)),
    label: "Last 90 days",
  },
} satisfies PeriodsDefinition;

export type TestMetricPeriodState = PeriodState<typeof TEST_METRICS_PERIOD>;

export function useTestPeriodState() {
  return usePeriodState({
    defaultValue: MetricsPeriod.Last_7Days,
    definition: TEST_METRICS_PERIOD,
    paramName: "period",
  });
}
