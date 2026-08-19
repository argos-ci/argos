import type { TestReportTest } from "@argos/schemas/build-metadata";
import { invariant } from "@argos/util/invariant";
import type { PartialModelObject, TransactionOrKnex } from "objection";

import { knex, raw } from "@/database";
import {
  Build,
  BuildShard,
  Flow,
  FlowRun,
  Screenshot,
} from "@/database/models";

/**
 * Escape a value to be used as a literal inside a SQL `LIKE` pattern.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Separator between the segments of a flow key. A test title can contain
 * anything a string can, so the separator is padded with spaces to stay
 * readable in the database while keeping collisions implausible.
 */
const KEY_SEPARATOR = " > ";

/**
 * Column widths of `flows`. Titles come from user code, so nothing stops one
 * from being longer than the column — it is truncated rather than rejected,
 * because losing the tail of a title is a much smaller problem than losing the
 * build it came in.
 */
const MAX_KEY_LENGTH = 1024;
const MAX_TITLE_LENGTH = 1024;

/**
 * Rows written per statement. A report can carry twenty thousand tests; one
 * statement that wide is a needlessly large parameter list to hand Postgres.
 */
const CHUNK_SIZE = 1000;

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : value.slice(0, maxLength - 1) + "…";
}

/**
 * The identity of a test across builds: its title path joined, starting at the
 * file it lives in. Deliberately free of the runner project, so the same test
 * under chromium and firefox is one flow with two runs.
 */
function getFlowKey(titlePath: string[]): string {
  return truncate(titlePath.join(KEY_SEPARATOR), MAX_KEY_LENGTH);
}

type FlowIdentity = {
  key: string;
  file: string;
  title: string;
  titlePath: string[];
};

/**
 * Read a flow's identity out of a reported test.
 *
 * The title path starts at the file, so its first segment is the file and its
 * last is the test title. A path with a single segment is a test declared
 * straight at the top level of its file, which is legal — the file is then both
 * ends of the path.
 */
function getFlowIdentity(test: TestReportTest): FlowIdentity {
  const [file] = test.titlePath;
  const title = test.titlePath.at(-1);
  invariant(
    file !== undefined && title !== undefined,
    "titlePath is not empty",
  );
  return {
    key: getFlowKey(test.titlePath),
    file: truncate(file, MAX_TITLE_LENGTH),
    title: truncate(title, MAX_TITLE_LENGTH),
    titlePath: test.titlePath,
  };
}

function* chunks<T>(items: T[]): Generator<T[]> {
  for (let index = 0; index < items.length; index += CHUNK_SIZE) {
    yield items.slice(index, index + CHUNK_SIZE);
  }
}

/**
 * Store the test list of a report as flows and runs of the build.
 *
 * Called once per request that carries a report — a single build's chunk or a
 * parallel shard — and safe to call again with the same payload: both writes
 * upsert on their unique index, so a retried upload converges instead of
 * duplicating.
 */
export async function ingestTestReport(params: {
  build: Build;
  shard: BuildShard | null;
  tests: TestReportTest[];
  trx: TransactionOrKnex;
}): Promise<void> {
  const { build, shard, tests, trx } = params;
  if (tests.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  // Several runner projects report the same test, so the same flow shows up
  // once per project in the payload. Only its identity is written here.
  const identities = new Map<string, FlowIdentity>();
  for (const test of tests) {
    const identity = getFlowIdentity(test);
    identities.set(identity.key, identity);
  }

  for (const chunk of chunks([...identities.values()])) {
    await Flow.query(trx)
      .insert(
        chunk.map((identity) => ({
          projectId: build.projectId,
          buildName: build.name,
          key: identity.key,
          file: identity.file,
          title: identity.title,
          titlePath: identity.titlePath,
          lastSeenAt: now,
        })),
      )
      .onConflict(["projectId", "buildName", "key"])
      // A test that moved in its file, or whose file was renamed under it,
      // keeps its history: the identity row is updated, not replaced.
      .merge(["file", "title", "titlePath", "lastSeenAt", "updatedAt"]);
  }

  // Read the ids back rather than trusting what the upsert returned: an
  // `ON CONFLICT` insert reports both the rows it inserted and the rows it
  // updated, and which of the two a driver hands back is not something worth
  // depending on here.
  const flowIdByKey = new Map<string, string>();
  for (const chunk of chunks([...identities.keys()])) {
    const rows = await Flow.query(trx)
      .select("id", "key")
      .where({ projectId: build.projectId, buildName: build.name })
      .whereIn("key", chunk);
    for (const row of rows) {
      flowIdByKey.set(row.key, row.id);
    }
  }

  const runs = tests.map((test): PartialModelObject<FlowRun> => {
    const key = getFlowKey(test.titlePath);
    const flowId = flowIdByKey.get(key);
    invariant(flowId, "every reported test was just upserted");
    return {
      buildId: build.id,
      flowId,
      buildShardId: shard?.id ?? null,
      // Never null: the unique index below relies on it, and Postgres counts
      // nulls as distinct.
      pwProject: test.project ?? "",
      pwTestId: test.id ?? null,
      status: test.status,
      outcome: test.outcome ?? null,
      duration: test.duration ?? null,
      retry: test.retry ?? null,
      line: test.location?.line ?? null,
      tags: test.tags ?? null,
      annotations: test.annotations ?? null,
    };
  });

  for (const chunk of chunks(runs)) {
    await FlowRun.query(trx)
      .insert(chunk)
      .onConflict(["buildId", "flowId", "pwProject"])
      // A shard re-uploaded after a retry reports the same run again, possibly
      // with a different outcome (it passed the second time). The latest report
      // wins.
      .merge([
        "buildShardId",
        "pwTestId",
        "status",
        "outcome",
        "duration",
        "retry",
        "line",
        "tags",
        "annotations",
        "updatedAt",
      ]);
  }
}

/**
 * Attach the build's screenshots to the runs that took them.
 *
 * Done in one statement at the end of the build rather than as screenshots come
 * in, because nothing orders the report against the screenshots: a parallel
 * build can upload a shard's screenshots before the shard that reports them,
 * and a chunked single build can split them across requests either way round.
 *
 * The join goes through the runner's own test id, which the SDK records in
 * `metadata.test.id` and the report repeats — so no title matching, and a test
 * whose title is a duplicate of another's is still attached to the right run.
 */
export async function attachScreenshotsToFlowRuns(params: {
  build: Build;
  trx: TransactionOrKnex;
}): Promise<void> {
  const { build, trx } = params;
  await trx.raw(
    `
      UPDATE screenshots
      SET "flowRunId" = flow_runs.id, "updatedAt" = NOW()
      FROM flow_runs
      WHERE screenshots."screenshotBucketId" = ?
        AND screenshots."flowRunId" IS NULL
        AND flow_runs."buildId" = ?
        AND flow_runs."pwTestId" IS NOT NULL
        AND flow_runs."pwTestId" = screenshots.metadata->'test'->>'id'
    `,
    [build.compareScreenshotBucketId, build.id],
  );
}

/**
 * The flows a build ran, in the order they are declared: by file, then by the
 * line the test sits on.
 *
 * The list is driven by the runs, not by the flows table, so it answers "what
 * this build ran" rather than "what this project has ever run". A test deleted
 * from the suite therefore disappears from the tab as soon as a build without
 * it becomes the reference, while keeping its rows and its history.
 */
export async function queryBuildFlows(params: {
  buildId: string;
  after: number;
  first: number;
  filters?: {
    search?: string | null;
    withScreenshots?: boolean | null;
  } | null;
}): Promise<{ total: number; results: Flow[] }> {
  const { buildId, after, first, filters } = params;

  const query = Flow.query()
    .alias("f")
    .select("f.*")
    .innerJoin(
      knex.raw(
        `(select "flowId", min(line) as line from flow_runs where "buildId" = ? group by "flowId") as r`,
        [buildId],
      ),
      "r.flowId",
      "f.id",
    )
    .orderBy([
      { column: "f.file" },
      // A run reported without a location sorts after the ones that have one,
      // rather than jumping to the top of its file.
      { column: "r.line", nulls: "last" },
      { column: "f.title" },
    ]);

  if (filters?.search) {
    const pattern = `%${escapeLikePattern(filters.search)}%`;
    query.where((builder) => {
      builder.whereRaw(`f.title ILIKE ?`, [pattern]);
      builder.orWhereRaw(`f.file ILIKE ?`, [pattern]);
    });
  }

  if (filters?.withScreenshots != null) {
    const captures = Screenshot.query()
      .alias("s")
      .innerJoin("flow_runs as fr", "fr.id", "s.flowRunId")
      .where("fr.buildId", buildId)
      .whereRaw(`fr."flowId" = f.id`);
    if (filters.withScreenshots) {
      query.whereExists(captures);
    } else {
      query.whereNotExists(captures);
    }
  }

  const [total, results] = await Promise.all([
    query.clone().resultSize(),
    query.offset(after).limit(first),
  ]);

  return { total, results };
}

export type BuildFlowStats = {
  flowCount: number;
  capturingFlowCount: number;
  screenshotCount: number;
  urlCount: number;
};

/**
 * The sentence above the list: how much of the suite the build captured.
 *
 * Deliberately not a ratio. A test that legitimately captures nothing — a
 * redirect guard, an API check — would drag a coverage percentage down for
 * doing exactly the right thing, so the numbers are stated and left to the
 * reader.
 */
export async function getBuildFlowStats(
  buildId: string,
): Promise<BuildFlowStats> {
  const result = await FlowRun.query()
    .alias("fr")
    .leftJoin("screenshots as s", "s.flowRunId", "fr.id")
    .where("fr.buildId", buildId)
    .select(
      raw(`count(distinct fr."flowId")::int as "flowCount"`),
      raw(
        `count(distinct fr."flowId") filter (where s.id is not null)::int as "capturingFlowCount"`,
      ),
      raw(`count(s.id)::int as "screenshotCount"`),
      raw(`count(distinct s.metadata->>'url')::int as "urlCount"`),
    )
    .first()
    .castTo<BuildFlowStats | undefined>();

  // An aggregate without `group by` always yields exactly one row.
  invariant(result, "flow stats not found");

  return result;
}

export type FlowRates = {
  /** Share of runs that ended in failure over the window, 0 to 1. */
  failureRate: number;
  /** Share of runs that only passed on a retry over the window, 0 to 1. */
  flakyRate: number;
};

/**
 * How often each flow failed, and how often it only passed on a retry.
 *
 * Both are read from the runs themselves rather than from the screenshots, so
 * they describe the test — which is a different thing from the visual
 * flakiness Argos already computes on screenshots, and the two are worth
 * reading side by side.
 */
export async function getFlowRates(params: {
  flowIds: readonly string[];
  from: Date;
}): Promise<Map<string, FlowRates>> {
  const { flowIds, from } = params;
  if (flowIds.length === 0) {
    return new Map();
  }

  const rows = await FlowRun.query()
    .whereIn("flowId", [...flowIds])
    .where("createdAt", ">=", from.toISOString())
    .groupBy("flowId")
    .select(
      "flowId",
      raw(`count(*)::int as "total"`),
      raw(
        `count(*) filter (where status in ('failed', 'timedOut'))::int as "failed"`,
      ),
      raw(`count(*) filter (where outcome = 'flaky')::int as "flaky"`),
    )
    .castTo<
      { flowId: string; total: number; failed: number; flaky: number }[]
    >();

  return new Map(
    rows.map((row) => [
      row.flowId,
      {
        failureRate: row.total > 0 ? row.failed / row.total : 0,
        flakyRate: row.total > 0 ? row.flaky / row.total : 0,
      },
    ]),
  );
}

/**
 * The journey a screenshot belongs to: the folder its name sits in.
 *
 * A suite that walks one long path through the product rarely does it in one
 * test — it is split into several, and what ties them back together is the
 * prefix the screenshots share (`screenshots(page, "supplier-invoice")` in
 * Playwright, `supplier-invoice/loan-beneficiary` on the way out). That prefix
 * is the journey.
 *
 * The runner project is stripped first: the SDK prefixes every name with it
 * (`chromium/supplier-invoice/…`), and a journey is the same journey whichever
 * browser walked it. A name with no folder left belongs to no journey — its
 * test is the whole story.
 */
export function getJourneyKey(
  screenshotName: string,
  runnerProject: string,
): string | null {
  const withoutProject =
    runnerProject && screenshotName.startsWith(`${runnerProject}/`)
      ? screenshotName.slice(runnerProject.length + 1)
      : screenshotName;
  const index = withoutProject.lastIndexOf("/");
  return index > 0 ? withoutProject.slice(0, index) : null;
}

export type JourneySegment = {
  flow: Flow;
  screenshots: Screenshot[];
};

export type Journey = {
  /** The shared folder, null when the flow's screenshots sit at the root. */
  key: string | null;
  /**
   * The flow the journey is read from — the first test that walks it.
   *
   * Every test of a journey shows the same journey, so they all have to point
   * at one address: without it, three rows of the table would open three URLs
   * rendering the same page, and sharing any of them would name a test that is
   * one step of what the reader sees.
   */
  entryFlowId: string;
  segments: JourneySegment[];
};

type ScreenshotRow = Screenshot & {
  flowId: string;
  runnerProject: string;
  runLine: number | null;
};

/**
 * Every screenshot of a build that belongs to a flow, with the flow it came
 * from. One query rather than one per flow: a journey spans tests by
 * definition, so the whole build is the working set either way.
 */
async function loadBuildScreenshots(buildId: string): Promise<ScreenshotRow[]> {
  return Screenshot.query()
    .alias("s")
    .select(
      "s.*",
      raw(`fr."flowId" as "flowId"`),
      raw(`fr."pwProject" as "runnerProject"`),
      raw(`fr.line as "runLine"`),
    )
    .innerJoin("flow_runs as fr", "fr.id", "s.flowRunId")
    .where("fr.buildId", buildId)
    .castTo<ScreenshotRow[]>();
}

/**
 * Order screenshots the way the test walked them.
 *
 * `capture.index` is recorded by the SDK; a screenshot without one — an older
 * SDK, or a runner capturing a failure on its own — sorts after the ones that
 * have it, rather than jumping to the front of the journey.
 */
export function compareCaptureOrder(a: Screenshot, b: Screenshot): number {
  const aIndex = a.metadata?.capture?.index ?? Number.MAX_SAFE_INTEGER;
  const bIndex = b.metadata?.capture?.index ?? Number.MAX_SAFE_INTEGER;
  return aIndex - bIndex || a.name.localeCompare(b.name);
}

/**
 * The journey each of these flows belongs to, read against the reference build
 * of their project.
 *
 * A journey is returned even when the flow shares its folder with nobody: it
 * is then a journey of one segment, which is what the flow page renders anyway.
 */
export async function loadFlowJourneys(
  flowIds: readonly string[],
): Promise<Map<string, Journey>> {
  const flows = await Flow.query().findByIds([...flowIds]);
  if (flows.length === 0) {
    return new Map();
  }

  const builds = await Build.query()
    .distinctOn("projectId")
    .whereIn("projectId", [...new Set(flows.map((flow) => flow.projectId))])
    .where("type", "reference")
    .orderBy([
      { column: "projectId" },
      { column: "createdAt", order: "desc" },
      { column: "number", order: "desc" },
    ]);

  const result = new Map<string, Journey>();

  for (const build of builds) {
    const rows = await loadBuildScreenshots(build.id);

    // Every flow of the build, not only the ones asked for: a journey pulls in
    // its sibling tests, and fetching those one at a time inside the loop below
    // would be an N+1 as soon as the list asks for a page of flows.
    const buildFlows = await Flow.query().findByIds([
      ...new Set(rows.map((row) => row.flowId)),
    ]);
    const flowById = new Map(buildFlows.map((item) => [item.id, item]));

    // The journey of a flow is the folder its own screenshots sit in. A flow
    // whose screenshots disagree is not a thing a suite produces, so the first
    // one that has a folder decides.
    const keyByFlow = new Map<string, string>();
    for (const row of rows) {
      if (keyByFlow.has(row.flowId)) {
        continue;
      }
      const key = getJourneyKey(row.name, row.runnerProject);
      if (key) {
        keyByFlow.set(row.flowId, key);
      }
    }

    const rowsByFlow = new Map<string, ScreenshotRow[]>();
    for (const row of rows) {
      const list = rowsByFlow.get(row.flowId) ?? [];
      list.push(row);
      rowsByFlow.set(row.flowId, list);
    }

    for (const flow of flows) {
      if (flow.projectId !== build.projectId) {
        continue;
      }
      const key = keyByFlow.get(flow.id) ?? null;
      // Flows of the journey, in declaration order — which is the order the
      // suite walks them, and so the order the journey reads in.
      const flowIdsOfJourney = key
        ? [...keyByFlow].filter(([, k]) => k === key).map(([id]) => id)
        : [flow.id];

      const resolved: JourneySegment[] = flowIdsOfJourney
        .map((id) => {
          const screenshots = (rowsByFlow.get(id) ?? []).sort(
            compareCaptureOrder,
          );
          const [first] = screenshots;
          return { id, screenshots, line: first?.runLine ?? null };
        })
        .filter((segment) => segment.screenshots.length > 0)
        .map((segment) => {
          const segmentFlow = flowById.get(segment.id);
          invariant(segmentFlow, "the flow of a screenshot exists");
          return {
            flow: segmentFlow,
            screenshots: segment.screenshots,
            line: segment.line,
          };
        })
        .sort(
          (a, b) =>
            a.flow.file.localeCompare(b.flow.file) ||
            (a.line ?? Number.MAX_SAFE_INTEGER) -
              (b.line ?? Number.MAX_SAFE_INTEGER) ||
            a.flow.title.localeCompare(b.flow.title),
        )
        .map(({ flow: segmentFlow, screenshots }) => ({
          flow: segmentFlow,
          screenshots,
        }));

      const [entry] = resolved;
      result.set(flow.id, {
        key,
        entryFlowId: entry?.flow.id ?? flow.id,
        segments: resolved,
      });
    }
  }

  return result;
}
