import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import type { QueryBuilder } from "objection";

import {
  Build,
  IgnoredChange,
  Screenshot,
  ScreenshotDiff,
  Test,
} from "@/database/models";
import { IMetricsPeriod } from "@/graphql/__generated__/resolver-types";
import {
  getChangesTotalOccurrences,
  getStartDateFromPeriod,
  type TestMetricsCounts,
} from "@/metrics/test";

export type LatestReferenceBuild = { id: string; projectId: string };

/**
 * Resolve the id of the latest reference build for each distinct build name of
 * each project.
 *
 * Teams can accumulate a massive reference-build history under only a handful of
 * build names (millions of builds, a few names). A plain `DISTINCT ON (name)`
 * has to read every reference build to dedupe — which is what made this step
 * take seconds. Instead we emulate a loose index scan ("skip scan") with a
 * recursive CTE: jump to the first build name, then to each next name via the
 * `(projectId, type, name, createdAt desc)` index, and grab that name's latest
 * build. That's ~2 index probes per build name instead of scanning the whole
 * history, so it no longer scales with the number of builds.
 *
 * The walk carries the project along so every project is covered by one
 * statement. Fanning it out per project instead meant `projectIds.length`
 * round-trips racing for a connection pool that is 6 wide by default — an
 * account with dozens of projects serialized into waves and starved every other
 * request on the process.
 */
export async function getLatestReferenceBuildIds(
  projectIds: string[],
): Promise<LatestReferenceBuild[]> {
  if (projectIds.length === 0) {
    return [];
  }
  return Sentry.startSpan(
    {
      name: "getLatestReferenceBuildIds",
      attributes: { "argos.project.count": projectIds.length },
    },
    async () => {
      const result = (await Build.knex().raw(
        `WITH RECURSIVE build_names AS (
           SELECT
             p.id AS "projectId",
             (
               SELECT min(b.name)
               FROM builds b
               WHERE b."projectId" = p.id AND b."type" = 'reference'
             ) AS name
           FROM unnest(:projectIds::bigint[]) AS p(id)
           UNION ALL
           SELECT
             build_names."projectId",
             (
               SELECT min(b.name)
               FROM builds b
               WHERE b."projectId" = build_names."projectId"
                 AND b."type" = 'reference'
                 AND b.name > build_names.name
             )
           FROM build_names
           WHERE build_names.name IS NOT NULL
         )
         SELECT
           build_names."projectId"::text AS "projectId",
           (
             SELECT b.id
             FROM builds b
             WHERE b."projectId" = build_names."projectId"
               AND b."type" = 'reference'
               AND b.name = build_names.name
             ORDER BY b."createdAt" DESC
             LIMIT 1
           )::text AS id
         FROM build_names
         WHERE build_names.name IS NOT NULL`,
        { projectIds },
      )) as { rows: { id: string | null; projectId: string }[] };

      return result.rows.filter(
        (row): row is LatestReferenceBuild => row.id !== null,
      );
    },
  );
}

/**
 * Whether a test still runs: `ongoing` when it shows up in the latest reference
 * build of its build name, `removed` when it does not. Mirrors the
 * `TestStatusLoader` used by GraphQL, on a single test.
 */
export async function getTestStatus(test: {
  id: string;
  projectId: string;
}): Promise<"ongoing" | "removed"> {
  const latestBuilds = await getLatestReferenceBuildIds([test.projectId]);
  if (latestBuilds.length === 0) {
    return "removed";
  }
  const diff = await ScreenshotDiff.query()
    .select("screenshot_diffs.id")
    .whereRaw(`"buildId" = any(:buildIds::bigint[])`, {
      buildIds: latestBuilds.map((build) => build.id),
    })
    .where("testId", test.id)
    .first();
  return diff ? "ongoing" : "removed";
}

type SeenDiffs = {
  first: ScreenshotDiff | null;
  last: ScreenshotDiff | null;
};

/**
 * The first and the last diff each test ever produced, aligned to the input
 * order. Only diffs carrying an image (`fileId`) count, so these are the first
 * and last time the test actually changed.
 */
export async function getTestsSeenDiffs(
  testIds: readonly string[],
): Promise<SeenDiffs[]> {
  if (testIds.length === 0) {
    return [];
  }

  return Sentry.startSpan(
    {
      name: "getTestsSeenDiffs",
      attributes: { "argos.test.count": testIds.length },
    },
    () => queryTestsSeenDiffs(testIds),
  );
}

async function queryTestsSeenDiffs(
  testIds: readonly string[],
): Promise<SeenDiffs[]> {
  const valuesSql = testIds.map(() => "(?::bigint)").join(", ");

  const rows = (await ScreenshotDiff.query()
    .from(ScreenshotDiff.raw(`(values ${valuesSql}) as t("testId")`, testIds))
    .joinRaw(
      `
      join lateral (
        (
          select sd.id, 'first' as kind
          from screenshot_diffs sd
          where sd."testId" = t."testId"
            and sd."fileId" is not null
          order by sd.id asc
          limit 1
        )
        union all
        (
          select sd.id, 'last' as kind
          from screenshot_diffs sd
          where sd."testId" = t."testId"
            and sd."fileId" is not null
          order by sd.id desc
          limit 1
        )
      ) pick on true
      `,
    )
    .join("screenshot_diffs", "screenshot_diffs.id", "pick.id")
    .select(
      ScreenshotDiff.raw(`t."testId"::text as "testId"`),
      "pick.kind",
      "screenshot_diffs.*",
    )) as unknown as (ScreenshotDiff & { testId: string; kind: string })[];

  const map = new Map<string, SeenDiffs>();
  for (const testId of testIds) {
    map.set(testId, { first: null, last: null });
  }

  for (const row of rows) {
    const entry = map.get(String(row.testId));
    invariant(entry, "Row for an unrequested test");
    switch (row.kind) {
      case "first": {
        entry.first = row;
        break;
      }
      case "last": {
        entry.last = row;
        break;
      }
    }
  }

  return testIds.map((testId) => {
    const entry = map.get(testId);
    invariant(entry, "Every test is seeded in the map");
    return entry;
  });
}

/**
 * The distinct changes (diff fingerprints) a test produced over a period, most
 * frequent first.
 *
 * A change is counted from the auto-approved (`reference`) builds only: those
 * are the builds where a diff means the test moved on its own, not because
 * someone changed the UI on a branch.
 */
export async function queryTestChanges(input: {
  projectId: string;
  testId: string;
  from: Date;
  /**
   * Restrict the changes to the ones currently ignored (`true`) or to the ones
   * still under review (`false`). `null` returns both.
   */
  ignored: boolean | null;
  offset: number;
  limit: number;
}): Promise<{ total: number; fingerprints: string[] }> {
  const { projectId, testId, from, ignored, offset, limit } = input;

  const totalOccurrencesQuery = `
    SELECT sum(tsf.value) FROM test_stats_fingerprints tsf
      WHERE tsf."testId" = screenshot_diffs."testId"
      AND tsf.fingerprint = screenshot_diffs.fingerprint
      AND tsf.date >= :from
  `;

  const diffQuery = ScreenshotDiff.query()
    .select("screenshot_diffs.id")
    .distinctOn("screenshot_diffs.fingerprint")
    .joinRelated("build")
    .where("screenshot_diffs.testId", testId)
    .where("screenshot_diffs.score", ">", 0)
    .where("build.type", "reference")
    .where("build.createdAt", ">", from)
    .whereNotNull("screenshot_diffs.fingerprint")
    .orderBy("screenshot_diffs.fingerprint");

  const query = ScreenshotDiff.query()
    .select("screenshot_diffs.fingerprint")
    .whereIn("id", diffQuery)
    .orderByRaw(`(${totalOccurrencesQuery}) DESC`, { from })
    .range(offset, offset + limit - 1);

  if (ignored != null) {
    // A change is ignored per project + test + fingerprint, and both the test
    // and the project are fixed here, so matching on the fingerprint alone is
    // enough.
    const ignoredFingerprints = IgnoredChange.query()
      .select("fingerprint")
      .where("projectId", projectId)
      .where("testId", testId);

    if (ignored) {
      query.whereIn("screenshot_diffs.fingerprint", ignoredFingerprints);
    } else {
      query.whereNotIn("screenshot_diffs.fingerprint", ignoredFingerprints);
    }
  }

  const result = await query;

  return {
    total: result.total,
    fingerprints: result.results.map((diff) => {
      invariant(
        diff.fingerprint,
        "Diffs without a fingerprint are filtered out by the query",
      );
      return diff.fingerprint;
    }),
  };
}

export type TestChangeStats = {
  totalOccurrences: number;
  firstSeenDiff: ScreenshotDiff;
  lastSeenDiff: ScreenshotDiff;
};

/**
 * How often each of a test's changes occurred over a period, and the first and
 * last diff carrying it. Results are aligned to the input fingerprints, which
 * must come from {@link queryTestChanges} over the same period — every one of
 * them therefore has at least one diff.
 */
export async function getTestChangesStats(input: {
  testId: string;
  fingerprints: string[];
  from: Date;
}): Promise<TestChangeStats[]> {
  const { testId, fingerprints, from } = input;

  if (fingerprints.length === 0) {
    return [];
  }

  const totalOccurrencesQuery = getChangesTotalOccurrences(
    fingerprints.map((fingerprint) => ({ testId, fingerprint })),
    { from },
  );

  const diffQuery = ScreenshotDiff.query()
    .select("screenshot_diffs.*")
    .distinctOn("screenshot_diffs.fingerprint")
    .joinRelated("build")
    .where("screenshot_diffs.testId", testId)
    .whereIn("screenshot_diffs.fingerprint", fingerprints)
    .where("screenshot_diffs.score", ">", 0)
    .where("build.type", "reference")
    .where("build.createdAt", ">=", from)
    .whereNotNull("screenshot_diffs.fingerprint")
    .orderBy("screenshot_diffs.fingerprint");

  const lastSeenQuery = diffQuery
    .clone()
    .orderBy("screenshot_diffs.createdAt", "desc");

  const firstSeenQuery = diffQuery
    .clone()
    .orderBy("screenshot_diffs.createdAt", "asc");

  const [lastSeenRows, firstSeenRows, totalOccurrences] = await Promise.all([
    lastSeenQuery,
    firstSeenQuery,
    totalOccurrencesQuery,
  ]);

  const lastSeenMap = new Map(
    lastSeenRows.map((diff) => [diff.fingerprint, diff]),
  );
  const firstSeenMap = new Map(
    firstSeenRows.map((diff) => [diff.fingerprint, diff]),
  );

  return fingerprints.map((fingerprint, index) => {
    const lastSeenDiff = lastSeenMap.get(fingerprint) ?? null;
    const firstSeenDiff = firstSeenMap.get(fingerprint) ?? null;
    invariant(lastSeenDiff, "Last seen diff should not be null");
    invariant(firstSeenDiff, "First seen diff should not be null");
    return {
      totalOccurrences: totalOccurrences[index] ?? 0,
      lastSeenDiff,
      firstSeenDiff,
    };
  });
}

/**
 * Compute a test's metrics over a period, correlated on `tests.id`.
 *
 * Flakiness is not stored — it is derived at read-time from the daily-bucketed
 * `test_stats_builds` (how many builds saw the test) and
 * `test_stats_fingerprints` (how many changes, and how many were unique). The
 * formula mirrors `computeTestMetrics` in `@/metrics/test`, down to the
 * intermediate rounding, so a row is ordered by the same flakiness it displays.
 *
 * Joined as a LATERAL so the counts come back with the row: the list is both
 * sorted by flakiness and able to prime the metrics loader from one pass,
 * instead of computing it here and again per visible row.
 *
 * Correlated only on `tests.id` + the period bounds, so it does not depend on
 * how many projects the candidate set spans — that is what lets one definition
 * power both the per-project and the account-wide list.
 */
const TEST_METRICS_LATERAL = `
  left join lateral (
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
          coalesce(sum(changes_value), 0)::numeric as changes,
          coalesce(count(*) filter (where fp_count = 1), 0)::numeric as "uniqueChanges"
        from fp_agg
      ),
      rates as (
        select
          coalesce(totals.total, 0)::numeric as total,
          changes.changes as changes,
          changes."uniqueChanges" as "uniqueChanges",
          case
            when changes.changes > 0
              then round(1 - changes.changes / nullif(totals.total, 0), 2)
            else 1
          end as stability,
          case
            when changes.changes > 0
              then case
                when changes."uniqueChanges" > 0
                  then round(changes."uniqueChanges" / changes.changes, 2)
                else 0
              end
            else 1
          end as consistency
        from totals, changes
      )
    select
      jsonb_build_object(
        'total', rates.total::bigint,
        'changes', rates.changes::bigint,
        'uniqueChanges', rates."uniqueChanges"::bigint
      ) as metrics,
      round(1 - (rates.stability + rates.consistency) / 2, 2) as flakiness
    from rates
  ) test_metrics on true
`;

const FLAKINESS_ORDER_BY = `
    test_metrics.flakiness desc nulls last,
    "tests"."createdAt" desc,
    "tests"."id" desc
`;

/**
 * Query the "active" tests for a set of projects, sorted by flakiness.
 *
 * A test is active when it appears in the latest reference build of its build
 * name (per project) as a non-child compare screenshot (`parentName IS NULL`).
 * Pass a single project id for the per-project Tests page, or every visible
 * project id for the account-wide aggregate.
 *
 * The active set is resolved in a few small, well-indexed steps rather than one
 * statement. The candidate set is tiny (≈ the number of active tests), so doing
 * the child-screenshot check and the final pagination on concrete id lists lets
 * Postgres use primary-key lookups throughout — instead of sorting every
 * reference build and hash-joining the whole `screenshots` table, which it picks
 * when it has to plan the whole thing from (badly wrong) row estimates.
 *
 * Returns Objection's `{ total, results }` range page so the caller can hand it
 * straight to `paginateResult`.
 */
export type ActiveTest = Test & { metrics: TestMetricsCounts };

export async function queryActiveTests(input: {
  projectIds: string[];
  period: IMetricsPeriod;
  filters?: {
    buildName?: string | null | undefined;
    search?: string | null | undefined;
  } | null;
  after: number;
  first: number;
}): Promise<{ total: number; results: ActiveTest[] }> {
  return Sentry.startSpan(
    {
      name: "queryActiveTests",
      attributes: {
        "argos.project.count": input.projectIds.length,
        "argos.tests.period": input.period,
      },
    },
    (span) => queryActiveTestsInner(input, span),
  );
}

async function queryActiveTestsInner(
  input: {
    projectIds: string[];
    period: IMetricsPeriod;
    filters?: {
      buildName?: string | null | undefined;
      search?: string | null | undefined;
    } | null;
    after: number;
    first: number;
  },
  span: Sentry.Span,
): Promise<{ total: number; results: ActiveTest[] }> {
  const { projectIds, period, filters, after, first } = input;
  const search = filters?.search?.trim();

  // Step 1 — the latest reference build per (project, name).
  const latestBuilds = await getLatestReferenceBuildIds(projectIds);
  span.setAttribute("argos.tests.latest_build_count", latestBuilds.length);
  if (latestBuilds.length === 0) {
    return { total: 0, results: [] };
  }
  const latestBuildIds = latestBuilds.map((build) => build.id);

  // Step 2 — the candidate `(testId, compareScreenshotId)` pairs in those builds.
  // Passing the build ids as an array rather than an `IN (...)` list keeps this
  // to a single bind parameter: a wide account has enough build names to make
  // the placeholder list itself a parse cost, and Postgres caps a statement at
  // 65535 parameters.
  const diffs = await Sentry.startSpan(
    { name: "queryActiveTests.candidateDiffs" },
    () =>
      ScreenshotDiff.query()
        .distinct("testId", "compareScreenshotId")
        .whereRaw(`"buildId" = any(:buildIds::bigint[])`, {
          buildIds: latestBuildIds,
        })
        .whereNotNull("testId")
        .whereNotNull("compareScreenshotId"),
  );
  span.setAttribute("argos.tests.candidate_diff_count", diffs.length);
  if (diffs.length === 0) {
    return { total: 0, results: [] };
  }

  // Step 3 — drop the rare child screenshots (those with a `parentName`, ~0.4%).
  // Looking them up by id is a handful of primary-key probes against the small
  // candidate set, instead of hash-joining every child screenshot (~1.4M rows).
  const compareScreenshotIds = [
    ...new Set(
      diffs
        .map((diff) => diff.compareScreenshotId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const childScreenshots = await Sentry.startSpan(
    {
      name: "queryActiveTests.childScreenshots",
      attributes: {
        "argos.tests.compare_screenshot_count": compareScreenshotIds.length,
      },
    },
    () =>
      Screenshot.query()
        .select("id")
        .whereRaw(`id = any(:ids::bigint[])`, { ids: compareScreenshotIds })
        .whereNotNull("parentName"),
  );
  const childScreenshotIds = new Set(
    childScreenshots.map((screenshot) => screenshot.id),
  );

  const activeTestIds = [
    ...new Set(
      diffs
        .filter(
          (diff) =>
            diff.compareScreenshotId !== null &&
            !childScreenshotIds.has(diff.compareScreenshotId),
        )
        .map((diff) => diff.testId)
        .filter((id): id is string => id !== null),
    ),
  ];
  span.setAttribute("argos.tests.active_count", activeTestIds.length);
  if (activeTestIds.length === 0) {
    return { total: 0, results: [] };
  }

  // Step 4 — rank the active tests by flakiness and paginate. `activeTestIds`
  // already scopes the result to the requested projects, so the id filter is all
  // we need.
  const applyFilters = (qb: QueryBuilder<Test, Test[]>) => {
    qb.whereRaw(`"tests"."id" = any(:testIds::bigint[])`, {
      testIds: activeTestIds,
    });
    if (filters?.buildName) {
      qb.where("tests.buildName", filters.buildName);
    }
    if (search) {
      // A test's name is its screenshot's name (see
      // `insertFilesAndScreenshots`), so matching `tests.name` is equivalent to
      // matching the compare screenshot name.
      qb.whereILike("tests.name", `%${search}%`);
    }
  };

  const metricsBindings = {
    from: getStartDateFromPeriod(period).toISOString(),
    to: new Date().toISOString(),
  };

  // The page and its count run side by side, and only the page pays for the
  // metrics lateral. `range()` would have run them back to back and dragged the
  // lateral into the count query, where the ordering it feeds is discarded.
  const [results, total] = await Promise.all([
    Sentry.startSpan({ name: "queryActiveTests.page" }, () =>
      Test.query()
        .select("tests.*", "test_metrics.metrics")
        .modify(applyFilters)
        .joinRaw(TEST_METRICS_LATERAL, metricsBindings)
        .orderByRaw(FLAKINESS_ORDER_BY)
        .limit(first)
        .offset(after),
    ),
    Sentry.startSpan({ name: "queryActiveTests.count" }, () =>
      Test.query().modify(applyFilters).resultSize(),
    ),
  ]);

  return { total, results: results as ActiveTest[] };
}
