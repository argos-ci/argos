import { Build, ScreenshotDiff, Test } from "@/database/models";
import { getStartDateFromPeriod } from "@/metrics/test";
import { sqids } from "@/util/sqids";

import type { IMetricsPeriod } from "../__generated__/resolver-types";
import { decodeFingerprint, encodeFingerprint } from "./fingerprint";

interface TestIdPayload {
  projectName: string;
  testId: string;
}

/**
 * Encodes a test ID string into a format that includes the project name.
 */
export function formatTestId(input: TestIdPayload) {
  const { projectName, testId } = input;
  return `${projectName.toUpperCase()}-${sqids.encode([Number(testId)])}`;
}

/**
 * Parses a test ID string into an object containing the project name and test ID.
 */
function parseTestId(input: string): TestIdPayload {
  const parts = input.split("-");
  const testId = parts.pop();
  const projectName = parts.join("-");
  if (!projectName || !testId) {
    throw new Error("Invalid test ID format");
  }
  const decoded = sqids.decode(testId)[0];
  if (decoded === undefined) {
    throw new Error("Invalid test ID format");
  }
  return {
    projectName,
    testId: String(decoded),
  };
}

/**
 * Parses a test ID string, returns null if it fails.
 */
export function safeParseTestId(input: string): TestIdPayload | null {
  try {
    return parseTestId(input);
  } catch {
    return null;
  }
}

export interface TestChangeIdPayload extends TestIdPayload {
  fingerprint: string;
}

/**
 * Encodes a test change ID string into a format that includes the project name.
 */
export function formatTestChangeId(input: TestChangeIdPayload): string {
  return `${formatTestId(input)}-${encodeFingerprint(input.fingerprint)}`;
}

/**
 * Parses a test change ID string into an object containing the project name and test ID.
 */
function parseTestChangeId(input: string): TestChangeIdPayload {
  const parts = input.split("-");
  const fingerprint = parts.pop();
  const testId = parts.join("-");
  if (!testId || !fingerprint) {
    throw new Error("Invalid test change ID format");
  }
  const testIdPayload = parseTestId(testId);
  const decodedFingerprint = decodeFingerprint(fingerprint);
  return {
    ...testIdPayload,
    fingerprint: decodedFingerprint,
  };
}

/**
 * Safely parses a change ID string, returning null if parsing fails.
 */
export function safeParseTestChangeId(
  input: string,
): TestChangeIdPayload | null {
  try {
    return parseTestChangeId(input);
  } catch (error) {
    console.error("Failed to parse test change ID:", input, error);
    return null;
  }
}

/**
 * Order tests by their flakiness score over a period, descending.
 *
 * Flakiness is not stored — it is derived at read-time from the daily-bucketed
 * `test_stats_builds` (how many builds saw the test) and
 * `test_stats_fingerprints` (how many changes, and how many were unique). The
 * formula mirrors `getTestAllMetrics` in `@/metrics/test`:
 *   stability   = changes > 0 ? 1 - changes / total : 1
 *   consistency = changes > 0 ? uniqueChanges / changes : 1
 *   flakiness   = 1 - (stability + consistency) / 2
 *
 * The subquery is correlated only on `tests.id` + the period bounds, so it does
 * not depend on how many projects the candidate set spans — that is what lets
 * one definition power both the per-project and the account-wide list.
 */
const FLAKINESS_ORDER_BY = `
    (
      with
        totals as (
          select sum(tsb.value)::numeric as total
          from test_stats_builds tsb
          where tsb."testId" = "tests"."id"
            and tsb."date" >= :from::timestamp
            and tsb."date" <  :to::timestamp
        ),
        fp_agg as (
          select
            tsf."fingerprint",
            sum(tsf.value)::numeric as changes_value,
            count(*) as fp_count
          from test_stats_fingerprints tsf
          where tsf."testId" = "tests"."id"
            and tsf."date" >= :from::timestamp
            and tsf."date" <  :to::timestamp
          group by tsf."fingerprint"
        ),
        changes as (
          select
            sum(changes_value)::numeric as changes,
            count(*) filter (where fp_count = 1)::numeric as "uniqueChanges"
          from fp_agg
        )
      select
        round(
          (
            1 - (
              (
                case
                  when coalesce(changes.changes, 0) > 0
                    then 1 - changes.changes / nullif(totals.total, 0)
                  else 1
                end
              +
                case
                  when coalesce(changes.changes, 0) > 0
                    then coalesce(changes."uniqueChanges", 0) / nullif(changes.changes, 0)
                  else 1
                end
              ) / 2
            )
          ),
          2
        )
      from totals, changes
    ) desc,
    "tests"."createdAt" desc,
    "tests"."id" desc
`;

/**
 * Query the "active" tests for a set of projects, sorted by flakiness.
 *
 * A test is active when it appears in the latest reference build of its build
 * name (per project) as a non-orphan compare screenshot. Pass a single project
 * id for the per-project Tests page, or every visible project id for the
 * account-wide aggregate.
 *
 * Returns Objection's `{ total, results }` range page so the caller can hand it
 * straight to `paginateResult`.
 */
export function queryActiveTests(input: {
  projectIds: string[];
  period: IMetricsPeriod;
  filters?: { buildName?: string | null; search?: string | null } | null;
  after: number;
  first: number;
}) {
  const { projectIds, period, filters, after, first } = input;
  const search = filters?.search?.trim();

  const latestRef = Build.query()
    .alias("b")
    .select("b.id", "b.projectId", "b.name")
    .distinctOn(["b.projectId", "b.name"])
    .where("b.type", "reference")
    .whereIn("b.projectId", projectIds)
    .orderBy("b.projectId")
    .orderBy("b.name")
    .orderBy("b.createdAt", "desc")
    .as("latest_reference_build");

  const activeTests = ScreenshotDiff.query()
    .alias("sd")
    .distinct("sd.testId")
    .join(latestRef, "latest_reference_build.id", "sd.buildId")
    .whereNotNull("sd.testId")
    .joinRelated("compareScreenshot")
    .whereNull("compareScreenshot.parentName")
    .modify((query) => {
      if (search) {
        query.whereILike("compareScreenshot.name", `%${search}%`);
      }
    })
    .as("active_tests");

  return (
    Test.query()
      .whereIn("tests.projectId", projectIds)
      .where((qb) => {
        if (filters?.buildName) {
          qb.where("tests.buildName", filters.buildName);
        }
      })
      // only ongoing
      .join(activeTests, "active_tests.testId", "tests.id")
      .orderByRaw(FLAKINESS_ORDER_BY, {
        from: getStartDateFromPeriod(period).toISOString(),
        to: new Date().toISOString(),
      })
      .range(after, after + first - 1)
  );
}
