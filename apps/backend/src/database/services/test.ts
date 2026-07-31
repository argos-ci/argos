import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";

import { Build, IgnoredChange, ScreenshotDiff } from "@/database/models";
import { getChangesTotalOccurrences } from "@/metrics/test";

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
