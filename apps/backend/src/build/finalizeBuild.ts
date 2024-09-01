import { TransactionOrKnex } from "objection";

import { Build, BuildShard, Screenshot } from "@/database/models/index.js";
import { BuildMetadata } from "@/database/schemas";

/**
 * Check if the bucket is valid from the metadata.
 */
export function checkIsBucketValidFromMetadata(metadata: BuildMetadata | null) {
  return !metadata?.testReport || metadata.testReport.status === "passed";
}

function add(a: number | undefined, b: number | undefined) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a + b;
}

/**
 * Aggregate metadata from multiple shards.
 */
function aggregateMetadata(allMetatada: (BuildMetadata | null)[]) {
  return allMetatada.reduce<BuildMetadata | null>((acc, item) => {
    if (!item?.testReport) {
      return acc;
    }

    if (!acc) {
      return item;
    }

    const status =
      acc.testReport?.status !== "failed" && item.testReport.status === "passed"
        ? "passed"
        : "failed";

    const startTime = (() => {
      const accStartTime = acc.testReport?.stats?.startTime;
      const itemStartTime = item.testReport?.stats?.startTime;
      if (!accStartTime) {
        return itemStartTime;
      }
      if (!itemStartTime) {
        return accStartTime;
      }
      return new Date(itemStartTime) < new Date(accStartTime)
        ? itemStartTime
        : accStartTime;
    })();

    return {
      testReport: {
        status,
        stats: {
          startTime,
          duration: add(
            acc.testReport?.stats?.duration,
            item.testReport?.stats?.duration,
          ),
          tests: add(
            acc.testReport?.stats?.tests,
            item.testReport?.stats?.tests,
          ),
          expected: add(
            acc.testReport?.stats?.expected,
            item.testReport?.stats?.expected,
          ),
          unexpected: add(
            acc.testReport?.stats?.unexpected,
            item.testReport?.stats?.unexpected,
          ),
        },
      },
    };
  }, null);
}

/**
 * Finalize a build.
 * - Count the number of screenshots in the compare bucket.
 * - Check if the build is considered valid.
 * - Update the compare bucket with the screenshot count and validity.
 */
export async function finalizeBuild(input: {
  trx?: TransactionOrKnex;
  build: Build;
  screenshotCount?: number;
}) {
  const { trx, build } = input;
  const [screenshotCount, shards] = await Promise.all([
    Screenshot.query(trx)
      .where("screenshotBucketId", build.compareScreenshotBucketId)
      .resultSize(),
    BuildShard.query(trx).select("metadata").where("buildId", build.id),
  ]);

  const valid =
    shards.length > 0
      ? shards.every((shard) => checkIsBucketValidFromMetadata(shard.metadata))
      : checkIsBucketValidFromMetadata(build.metadata);

  const metadata =
    shards.length > 0
      ? aggregateMetadata(shards.map((shard) => shard.metadata))
      : build.metadata;

  await Promise.all([
    metadata !== build.metadata
      ? build.$clone().$query(trx).patch({ metadata })
      : null,
    build
      .$relatedQuery("compareScreenshotBucket", trx)
      .patch({ complete: true, screenshotCount, valid }),
  ]);
}
