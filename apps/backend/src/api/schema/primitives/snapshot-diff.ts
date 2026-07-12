import { ScreenshotMetadataSchema } from "@argos/schemas/screenshot-metadata";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  IgnoredChange,
  Screenshot,
  ScreenshotDiff,
  type File as FileModel,
} from "@/database/models";
import { getChangesTotalOccurrences, getTestAllMetrics } from "@/metrics/test";
import { getPublicFileUrl, getPublicUrl, getTwicPicsUrl } from "@/storage";
import { formatTestChangeId, formatTestId } from "@/util/test-id";

import { ChangeSchema } from "./change";

const SnapshotDiffStatusSchema = z
  .enum([
    "pending",
    "removed",
    "failure",
    "added",
    "changed",
    "unchanged",
    "retryFailure",
    "ignored",
  ])
  .meta({
    description: "Status of the snapshot diff",
  });

const TestMetricsSchema = z
  .object({
    total: z.number().meta({
      description:
        "Number of builds in which this test ran over the metrics period.",
    }),
    changes: z.number().meta({
      description:
        "Number of times the test changed (produced a diff) over the metrics period.",
    }),
    uniqueChanges: z.number().meta({
      description:
        "Number of changes that were seen only once over the metrics period. A high ratio of unique changes is a strong flakiness signal.",
    }),
    stability: z.number().meta({
      description:
        "Ratio of builds without a change, between 0 and 1. `1` means the test never changed.",
    }),
    consistency: z.number().meta({
      description:
        "How consistent the changes are, between 0 and 1. `1` means changes repeat the same way; a low value means changes are erratic.",
    }),
    flakiness: z.number().meta({
      description:
        "Overall flakiness score between 0 and 1, derived from stability and consistency. `0` means stable, `1` means highly flaky.",
    }),
  })
  .meta({
    description: "Flakiness metrics of a test over the requested period.",
    id: "TestMetrics",
  });

const TestSchema = z
  .object({
    id: z.string().meta({
      description: "Unique identifier of the test",
    }),
    name: z.string().meta({
      description: "Name of the test",
    }),
    buildName: z.string().meta({
      description: "Name of the build the test belongs to",
    }),
    metrics: TestMetricsSchema,
  })
  .meta({
    description:
      "Test associated to a diff, with flakiness metrics to help decide whether a change is worth reviewing.",
    id: "Test",
  });

const Snapshot = z
  .object({
    id: z.string().meta({
      description: "Unique identifier of the snapshot",
    }),
    name: z.string().meta({
      description: "Name of the snapshot",
    }),
    metadata: ScreenshotMetadataSchema.nullable(),
    width: z.number().nullable().meta({
      description: "Width of the screenshot in pixels",
    }),
    height: z.number().nullable().meta({
      description: "Height of the screenshot in pixels",
    }),
    url: z.url().meta({
      description: "Public URL of the snapshot",
    }),
    contentType: z.string().meta({
      description: "Content type of the snapshot file",
    }),
  })
  .meta({
    description: "Snapshot associated to a diff",
  });

export const SnapshotDiffSchema = z
  .object({
    id: z.string().meta({
      description: "Unique identifier of the snapshot diff",
    }),
    name: z.string().meta({
      description: "Name of the snapshot diff",
    }),
    status: SnapshotDiffStatusSchema,
    score: z.number().nullable().meta({
      description: "Similarity score between snapshots",
    }),
    group: z.string().nullable().meta({
      description: "Grouping key for the snapshot diff",
    }),
    parentName: z.string().nullable().meta({
      description: "Parent name of the snapshot (usually the story id)",
    }),
    url: z.url().nullable().meta({
      description: "URL of the diff image",
    }),
    base: Snapshot.nullable(),
    head: Snapshot.nullable(),
    test: TestSchema.nullable(),
    change: ChangeSchema.nullable(),
  })
  .meta({
    description: "Snapshot diff",
    id: "SnapshotDiff",
  });

type SerializedScreenshot = z.infer<typeof Snapshot>;

async function serializeSnapshot(
  screenshot: Screenshot | null | undefined,
): Promise<SerializedScreenshot | null> {
  if (!screenshot) {
    return null;
  }

  const file = screenshot.file as FileModel | null | undefined;
  const url = file
    ? await getPublicFileUrl(file)
    : await getPublicUrl(screenshot.s3Id);

  return {
    id: screenshot.id,
    name: screenshot.name,
    metadata: screenshot.metadata,
    width: file?.width ?? null,
    height: file?.height ?? null,
    url,
    contentType: file?.contentType ?? "image/png",
  };
}

async function getSnapshotDiffUrl(diff: ScreenshotDiff) {
  const file = diff.file as FileModel | null | undefined;
  if (file) {
    return getPublicFileUrl(file);
  }
  if (diff.s3Id) {
    return getTwicPicsUrl(diff.s3Id);
  }
  return null;
}

/**
 * The key of a test change, used to look up per-change data (ignore state,
 * occurrences) that is shared by every diff of the same change.
 */
function getChangeKey(testId: string, fingerprint: string): string {
  return `${testId}|${fingerprint}`;
}

/**
 * Batch-load the test-level and change-level enrichment for a page of diffs:
 * flakiness metrics per test, and the ignore state + occurrence count per
 * change. Returns lookup maps keyed by test id / change key.
 */
async function loadDiffsEnrichment(
  diffs: ScreenshotDiff[],
  options: { projectId: string; metricsFrom: Date },
) {
  const { projectId, metricsFrom } = options;

  const testIds = [
    ...new Set(
      diffs
        .map((diff) => diff.testId)
        .filter((testId): testId is string => testId !== null),
    ),
  ];

  // A change is a diff that carries both a test and a fingerprint. Several diffs
  // in the page can point to the same change, so we deduplicate before querying.
  const changePairsByKey = new Map<
    string,
    { testId: string; fingerprint: string }
  >();
  for (const diff of diffs) {
    if (diff.testId && diff.fingerprint) {
      changePairsByKey.set(getChangeKey(diff.testId, diff.fingerprint), {
        testId: diff.testId,
        fingerprint: diff.fingerprint,
      });
    }
  }
  const changePairs = [...changePairsByKey.values()];

  const [metrics, occurrences, ignoredChanges] = await Promise.all([
    getTestAllMetrics(testIds, { from: metricsFrom }),
    getChangesTotalOccurrences(changePairs, { from: metricsFrom }),
    changePairs.length > 0
      ? IgnoredChange.query().whereIn(
          ["projectId", "testId", "fingerprint"],
          changePairs.map((pair) => [projectId, pair.testId, pair.fingerprint]),
        )
      : [],
  ]);

  const metricsByTestId = new Map(
    testIds.map((testId, index) => [testId, metrics[index]]),
  );
  const occurrencesByChangeKey = new Map(
    changePairs.map((pair, index) => [
      getChangeKey(pair.testId, pair.fingerprint),
      occurrences[index] ?? 0,
    ]),
  );
  const ignoredChangeKeys = new Set(
    ignoredChanges.map((change) =>
      getChangeKey(change.testId, change.fingerprint),
    ),
  );

  return { metricsByTestId, occurrencesByChangeKey, ignoredChangeKeys };
}

/**
 * Serialize screenshot diffs into the public API shape, including resolved diff
 * status, snapshot payloads, the public URL for the diff image, and the test /
 * change flakiness data used to decide whether a change is worth reviewing.
 */
export async function serializeSnapshotDiffs(
  diffs: ScreenshotDiff[],
  options: {
    project: { id: string; name: string };
    metricsFrom: Date;
  },
): Promise<z.infer<typeof SnapshotDiffSchema>[]> {
  const { project, metricsFrom } = options;

  const { metricsByTestId, occurrencesByChangeKey, ignoredChangeKeys } =
    await loadDiffsEnrichment(diffs, {
      projectId: project.id,
      metricsFrom,
    });

  return Promise.all(
    diffs.map(async (diff) => {
      const [status, base, head, url] = await Promise.all([
        diff.$getDiffStatus(),
        serializeSnapshot(diff.baseScreenshot),
        serializeSnapshot(diff.compareScreenshot),
        getSnapshotDiffUrl(diff),
      ]);
      const name = base?.name ?? head?.name;
      invariant(name, "Screenshot diff without name");
      const parentName =
        diff.compareScreenshot?.parentName ??
        diff.baseScreenshot?.parentName ??
        null;

      const test = (() => {
        if (!diff.testId || !diff.test) {
          return null;
        }
        const metrics = metricsByTestId.get(diff.testId);
        invariant(metrics, "Metrics should be loaded for every test");
        return {
          id: formatTestId({ projectName: project.name, testId: diff.testId }),
          name: diff.test.name,
          buildName: diff.test.buildName,
          metrics,
        };
      })();

      const change =
        diff.testId && diff.fingerprint
          ? (() => {
              const changeKey = getChangeKey(diff.testId, diff.fingerprint);
              return {
                id: formatTestChangeId({
                  projectName: project.name,
                  testId: diff.testId,
                  fingerprint: diff.fingerprint,
                }),
                ignored: ignoredChangeKeys.has(changeKey),
                occurrences: occurrencesByChangeKey.get(changeKey) ?? 0,
              };
            })()
          : null;

      return {
        id: diff.id,
        name,
        status,
        score: diff.score,
        group: diff.group,
        parentName,
        url,
        base,
        head,
        test,
        change,
      };
    }),
  );
}
