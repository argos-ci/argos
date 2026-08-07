import { z } from "zod";

import { IMetricsPeriod } from "@/graphql/__generated__/resolver-types";
import { getStartDateFromPeriod } from "@/metrics/test";

/**
 * Period over which flakiness metrics are computed. Mirrors the `MetricsPeriod`
 * GraphQL enum; the values match {@link IMetricsPeriod}.
 */
export const MetricsPeriodSchema = z
  .enum([
    "LAST_24_HOURS",
    "LAST_3_DAYS",
    "LAST_7_DAYS",
    "LAST_30_DAYS",
    "LAST_90_DAYS",
  ])
  .default("LAST_7_DAYS")
  .meta({
    description: "Period over which the test flakiness metrics are computed.",
  });

export type MetricsPeriod = z.infer<typeof MetricsPeriodSchema>;

/**
 * A period's wire value mapped to the enum the metrics layer speaks. Both sides
 * spell the periods the same way, but a string literal is not assignable to a
 * TypeScript string enum, so the crossing is written out once here instead of
 * being cast at every call site.
 */
const METRICS_PERIODS = {
  LAST_24_HOURS: IMetricsPeriod.Last_24Hours,
  LAST_3_DAYS: IMetricsPeriod.Last_3Days,
  LAST_7_DAYS: IMetricsPeriod.Last_7Days,
  LAST_30_DAYS: IMetricsPeriod.Last_30Days,
  LAST_90_DAYS: IMetricsPeriod.Last_90Days,
} as const satisfies Record<MetricsPeriod, IMetricsPeriod>;

/** Date the given metrics period starts at. */
export function getMetricsPeriodStartDate(period: MetricsPeriod): Date {
  return getStartDateFromPeriod(METRICS_PERIODS[period]);
}

/**
 * A period in the enum the shared services speak, for the queries that take it
 * directly rather than as a start date.
 */
export function toMetricsPeriodEnum(period: MetricsPeriod): IMetricsPeriod {
  return METRICS_PERIODS[period];
}
