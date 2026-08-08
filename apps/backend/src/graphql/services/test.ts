import type { ActiveTest } from "@/database/services/test";
import { computeTestMetrics, getStartDateFromPeriod } from "@/metrics/test";

import type { IMetricsPeriod } from "../__generated__/resolver-types";
import type { createLoaders } from "../loaders";

/**
 * Seed the metrics loader with the counts the ranking pass already computed.
 *
 * Sorting by flakiness means the metrics of every returned row were computed to
 * produce the order; without this the `Test.metrics` resolver would turn around
 * and compute them a second time for each visible row.
 */
export function primeActiveTestMetrics(input: {
  loaders: ReturnType<typeof createLoaders>;
  results: ActiveTest[];
  period: IMetricsPeriod;
}) {
  const { loaders, results, period } = input;
  const from = getStartDateFromPeriod(period);
  for (const test of results) {
    loaders.TestAllMetrics.prime(
      { testId: test.id, from },
      computeTestMetrics(test.metrics),
    );
  }
}
