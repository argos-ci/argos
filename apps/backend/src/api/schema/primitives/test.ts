import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { ScreenshotDiff, type Project, type Test } from "@/database/models";
import {
  getTestChangesStats,
  getTestsSeenDiffs,
  getTestStatus,
  queryTestChanges,
} from "@/database/services/test";
import { getTestAllMetrics, getTestSeriesMetrics } from "@/metrics/test";
import { formatTestChangeId, formatTestId } from "@/util/test-id";

import { ChangeSchema } from "./change";
// `Test` and `TestMetrics` describe the test as embedded in a diff, so they live
// with the diff schemas; the full test resource below builds on them.
import {
  getSnapshotDiffUrl,
  serializeSnapshotDiffs,
  SnapshotDiffSchema,
  TestSchema,
} from "./snapshot-diff";

export const TestId = z.string().meta({
  description: "The test identifier, as returned in a diff's `test.id`",
  example: "WEB-xf23d",
  id: "TestId",
});

const TestStatusSchema = z.enum(["ongoing", "removed"]).meta({
  description:
    "`ongoing` when the test still runs — it showed up in the latest build of its build name. `removed` when it did not, so it was deleted, renamed or skipped.",
  id: "TestStatus",
});

const TestMetricsDataPointSchema = z
  .object({
    date: z.iso.datetime().meta({
      description: "Start of the time bucket.",
    }),
    total: z.number().meta({
      description: "Number of builds in which the test ran in this bucket.",
    }),
    changes: z.number().meta({
      description: "Number of times the test changed in this bucket.",
    }),
    uniqueChanges: z.number().meta({
      description: "Number of those changes that were seen only once.",
    }),
  })
  .meta({
    description:
      "One bucket of a test's metrics over time. The bucket size is derived from the requested period.",
    id: "TestMetricsDataPoint",
  });

const TestChangeOccurrenceSchema = z
  .object({
    date: z.iso.datetime().meta({
      description: "When the diff was captured.",
    }),
    url: z.url().nullable().meta({
      description:
        "Public URL of the diff image. Null when the image is no longer available.",
    }),
    buildNumber: z.int().min(1).meta({
      description: "Number of the build that captured the diff.",
      example: 42,
    }),
    buildUrl: z.url().meta({
      description: "URL of that build in Argos.",
    }),
  })
  .meta({
    description: "A single appearance of a change, in the build that saw it.",
    id: "TestChangeOccurrence",
  });

/**
 * A test as it appears in a project listing. The heavier per-test reads that
 * {@link TestDetailsSchema} performs (status, series, first/last change) are
 * deliberately left out: a page of them would be a query each, and the ranking
 * already answers what a list is for.
 */
export const TestSummarySchema = TestSchema.meta({
  description:
    "A test with its flakiness metrics over the requested period. Fetch the test itself for its history and the changes behind the score.",
  id: "TestSummary",
});

export const TestDetailsSchema = TestSchema.extend({
  status: TestStatusSchema,
  createdAt: z.iso.datetime().meta({
    description: "When Argos first saw this test.",
  }),
  url: z.url().meta({
    description: "URL of the test in Argos.",
  }),
  series: z.array(TestMetricsDataPointSchema).meta({
    description:
      "The test's metrics bucketed over the requested period, oldest first. Use it to tell a test that has always been flaky from one that only started recently.",
  }),
  firstSeenChange: TestChangeOccurrenceSchema.nullable().meta({
    description:
      "The first time this test ever changed, whatever the period. Null when it never changed.",
  }),
  lastSeenChange: TestChangeOccurrenceSchema.nullable().meta({
    description:
      "The last time this test changed, whatever the period. Null when it never changed.",
  }),
}).meta({
  description:
    "A test with its flakiness metrics, both aggregated and over time, and when it first and last changed.",
  id: "TestDetails",
});

export const TestChangeSchema = ChangeSchema.extend({
  firstSeen: TestChangeOccurrenceSchema.meta({
    description: "The first time this change was seen over the period.",
  }),
  lastSeen: TestChangeOccurrenceSchema.meta({
    description: "The last time this change was seen over the period.",
  }),
  diff: SnapshotDiffSchema.meta({
    description:
      "The diff captured the last time the change was seen, with the baseline and the captured snapshot, so you can look at what moved.",
  }),
}).meta({
  description:
    "One distinct change of a test: an exact visual difference, with how often it came back over the period. A change that keeps reappearing while nothing in the UI changed is a flaky one.",
  id: "TestChange",
});

/**
 * Relations `serializeOccurrence` reads. `build.project.account` is fetched
 * eagerly so `build.getUrl()` doesn't go back to the database per diff.
 */
const OCCURRENCE_GRAPH = "[file, build.project.account]";

/** {@link OCCURRENCE_GRAPH} plus what `serializeSnapshotDiffs` reads. */
const CHANGE_DIFF_GRAPH =
  "[file, build.project.account, baseScreenshot.file, compareScreenshot.file, test]";

/**
 * When a diff was captured and the build it belongs to. Needs
 * {@link OCCURRENCE_GRAPH} fetched.
 */
async function serializeOccurrence(
  diff: ScreenshotDiff,
): Promise<z.infer<typeof TestChangeOccurrenceSchema>> {
  const { build } = diff;
  invariant(build, "Diff build should be fetched");
  const [url, buildUrl] = await Promise.all([
    getSnapshotDiffUrl(diff),
    build.getUrl(),
  ]);
  return {
    date: new Date(diff.createdAt).toISOString(),
    url,
    buildNumber: build.number,
    buildUrl,
  };
}

/**
 * Serialize a test into the public API shape: its identity and status, its
 * flakiness metrics over the requested period — both aggregated and bucketed
 * over time — and when it first and last changed.
 */
export async function serializeTestDetails(
  test: Test,
  options: { project: Project; metricsFrom: Date },
): Promise<z.infer<typeof TestDetailsSchema>> {
  const { project, metricsFrom } = options;

  const [[metrics], series, [seenDiffs], status, url] = await Promise.all([
    getTestAllMetrics([test.id], { from: metricsFrom }),
    getTestSeriesMetrics({ testId: test.id, from: metricsFrom }),
    getTestsSeenDiffs([test.id]),
    getTestStatus(test),
    test.getUrl(),
  ]);

  invariant(metrics, "Metrics should be loaded for the test");
  invariant(seenDiffs, "Seen diffs should be loaded for the test");

  const seenChanges = [seenDiffs.first, seenDiffs.last].filter(
    (diff): diff is ScreenshotDiff => diff !== null,
  );
  await ScreenshotDiff.fetchGraph(seenChanges, OCCURRENCE_GRAPH);

  const [firstSeenChange, lastSeenChange] = await Promise.all([
    seenDiffs.first ? serializeOccurrence(seenDiffs.first) : null,
    seenDiffs.last ? serializeOccurrence(seenDiffs.last) : null,
  ]);

  return {
    id: formatTestId({ projectName: project.name, testId: test.id }),
    name: test.name,
    buildName: test.buildName,
    metrics,
    status,
    createdAt: new Date(test.createdAt).toISOString(),
    url,
    series: series.map((point) => ({
      date: new Date(point.ts).toISOString(),
      total: point.total,
      changes: point.changes,
      uniqueChanges: point.uniqueChanges,
    })),
    firstSeenChange,
    lastSeenChange,
  };
}

/**
 * List a test's distinct changes over a period, the ones that came back most
 * often first, each with the diff of its latest occurrence.
 */
export async function listTestChanges(input: {
  test: Test;
  project: Project;
  metricsFrom: Date;
  ignored: boolean | null;
  page: number;
  perPage: number;
}): Promise<{ total: number; results: z.infer<typeof TestChangeSchema>[] }> {
  const { test, project, metricsFrom, ignored, page, perPage } = input;

  const { total, fingerprints } = await queryTestChanges({
    projectId: project.id,
    testId: test.id,
    from: metricsFrom,
    ignored,
    offset: (page - 1) * perPage,
    limit: perPage,
  });

  const stats = await getTestChangesStats({
    testId: test.id,
    fingerprints,
    from: metricsFrom,
  });

  const lastSeenDiffs = stats.map((stat) => stat.lastSeenDiff);
  await Promise.all([
    ScreenshotDiff.fetchGraph(
      stats.map((stat) => stat.firstSeenDiff),
      OCCURRENCE_GRAPH,
    ),
    ScreenshotDiff.fetchGraph(lastSeenDiffs, CHANGE_DIFF_GRAPH),
  ]);

  const [diffs, occurrences] = await Promise.all([
    serializeSnapshotDiffs(lastSeenDiffs, { project, metricsFrom }),
    Promise.all(
      stats.map(async (stat) => ({
        firstSeen: await serializeOccurrence(stat.firstSeenDiff),
        lastSeen: await serializeOccurrence(stat.lastSeenDiff),
      })),
    ),
  ]);

  return {
    total,
    results: fingerprints.map((fingerprint, index) => {
      const stat = stats[index];
      const diff = diffs[index];
      const occurrence = occurrences[index];
      invariant(
        stat && diff && occurrence,
        "Every change of the page is serialized",
      );
      // Every change comes from a fingerprinted diff of this test, so the
      // serialized diff always carries the matching change payload.
      invariant(diff.change, "A change's diff carries its change");
      return {
        id: formatTestChangeId({
          projectName: project.name,
          testId: test.id,
          fingerprint,
        }),
        ignored: diff.change.ignored,
        occurrences: stat.totalOccurrences,
        firstSeen: occurrence.firstSeen,
        lastSeen: occurrence.lastSeen,
        diff,
      };
    }),
  };
}
