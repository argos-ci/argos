import { z } from "zod";

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
