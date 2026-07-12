import { Build, Screenshot, ScreenshotDiff, Test } from "@/database/models";
import { getStartDateFromPeriod } from "@/metrics/test";

import type { IMetricsPeriod } from "../__generated__/resolver-types";

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
 * Resolve the id of the latest reference build for each distinct build name in a
 * project.
 *
 * Teams can accumulate a massive reference-build history under only a handful of
 * build names (millions of builds, a few names). A plain `DISTINCT ON (name)`
 * has to read every reference build to dedupe — which is what made this step
 * take seconds. Instead we emulate a loose index scan ("skip scan") with a
 * recursive CTE: jump to the first build name, then to each next name via the
 * `(projectId, type, name, createdAt desc)` index, and grab that name's latest
 * build. That's ~2 index probes per build name instead of scanning the whole
 * history, so it no longer scales with the number of builds.
 */
async function getLatestReferenceBuildIds(projectIds: string[]) {
  const perProject = await Promise.all(
    projectIds.map(async (projectId) => {
      const result = (await Build.knex().raw(
        `WITH RECURSIVE build_names AS (
           SELECT min(name) AS name
           FROM builds
           WHERE "projectId" = :projectId AND "type" = 'reference'
           UNION ALL
           SELECT (
             SELECT min(b.name)
             FROM builds b
             WHERE b."projectId" = :projectId
               AND b."type" = 'reference'
               AND b.name > build_names.name
           )
           FROM build_names
           WHERE build_names.name IS NOT NULL
         )
         SELECT (
           SELECT b.id
           FROM builds b
           WHERE b."projectId" = :projectId
             AND b."type" = 'reference'
             AND b.name = build_names.name
           ORDER BY b."createdAt" DESC
           LIMIT 1
         ) AS id
         FROM build_names
         WHERE build_names.name IS NOT NULL`,
        { projectId },
      )) as { rows: { id: string | null }[] };
      return result.rows;
    }),
  );
  return perProject
    .flat()
    .map((row) => row.id)
    .filter((id): id is string => id !== null);
}

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
export async function queryActiveTests(input: {
  projectIds: string[];
  period: IMetricsPeriod;
  filters?: { buildName?: string | null; search?: string | null } | null;
  after: number;
  first: number;
}) {
  const { projectIds, period, filters, after, first } = input;
  const search = filters?.search?.trim();

  // Step 1 — the latest reference build per (project, name).
  const latestBuildIds = await getLatestReferenceBuildIds(projectIds);
  if (latestBuildIds.length === 0) {
    return { total: 0, results: [] };
  }

  // Step 2 — the candidate `(testId, compareScreenshotId)` pairs in those builds.
  const diffs = await ScreenshotDiff.query()
    .distinct("testId", "compareScreenshotId")
    .whereIn("buildId", latestBuildIds)
    .whereNotNull("testId")
    .whereNotNull("compareScreenshotId");
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
  const childScreenshots = await Screenshot.query()
    .select("id")
    .whereIn("id", compareScreenshotIds)
    .whereNotNull("parentName");
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
  if (activeTestIds.length === 0) {
    return { total: 0, results: [] };
  }

  // Step 4 — rank the active tests by flakiness and paginate. `activeTestIds`
  // already scopes the result to the requested projects, so the id filter is all
  // we need.
  return Test.query()
    .whereIn("tests.id", activeTestIds)
    .where((qb) => {
      if (filters?.buildName) {
        qb.where("tests.buildName", filters.buildName);
      }
    })
    .modify((qb) => {
      if (search) {
        // A test's name is its screenshot's name (see
        // `insertFilesAndScreenshots`), so matching `tests.name` is equivalent to
        // matching the compare screenshot name.
        qb.whereILike("tests.name", `%${search}%`);
      }
    })
    .orderByRaw(FLAKINESS_ORDER_BY, {
      from: getStartDateFromPeriod(period).toISOString(),
      to: new Date().toISOString(),
    })
    .range(after, after + first - 1);
}
