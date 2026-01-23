import moment from "moment";

import { MetricsPeriod } from "@/gql/graphql";

import { usePeriodState, type PeriodsDefinition } from "../PeriodSelect";

const now = new Date();

const TEST_METRICS_PERIOD = {
  [MetricsPeriod.Last_24Hours]: {
    from: moment(now).subtract(24, "hours").toDate(),
    label: "Last 24 hours",
  },
  [MetricsPeriod.Last_3Days]: {
    from: moment(now).subtract(3, "days").startOf("day").toDate(),
    label: "Last 3 days",
  },
  [MetricsPeriod.Last_7Days]: {
    from: moment(now).subtract(7, "days").startOf("day").toDate(),
    label: "Last 7 days",
  },
  [MetricsPeriod.Last_30Days]: {
    from: moment(now).subtract(30, "days").startOf("day").toDate(),
    label: "Last 30 days",
  },
  [MetricsPeriod.Last_90Days]: {
    from: moment(now).subtract(90, "days").startOf("day").toDate(),
    label: "Last 90 days",
  },
} satisfies PeriodsDefinition;

export function useTestPeriodState() {
  return usePeriodState({
    defaultValue: MetricsPeriod.Last_7Days,
    definition: TEST_METRICS_PERIOD,
    paramName: "period",
  });
}
