import { ref, TransactionOrKnex } from "objection";

import { Build, BuildShard, Screenshot } from "@/database/models/index.js";
import { BuildMetadata } from "@/database/schemas";
import { ARGOS_STORYBOOK_SDK_NAME } from "@/util/argos-sdk";

/**
 * Check if the bucket is valid from the metadata.
 */
export function checkIsBucketValidFromMetadata(metadata: BuildMetadata | null) {
  return !metadata?.testReport || metadata.testReport.status === "passed";
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

    const duration = (() => {
      const accDuration = acc.testReport?.stats?.duration;
      const itemDuration = item.testReport?.stats?.duration;
      if (accDuration == null) {
        return itemDuration;
      }
      if (itemDuration == null) {
        return accDuration;
      }
      return itemDuration + accDuration;
    })();

    return {
      testReport: {
        status,
        stats: {
          startTime,
          duration,
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
}) {
  const { trx, build } = input;
  const countQuery = Screenshot.query(trx).where(
    "screenshotBucketId",
    build.compareScreenshotBucketId,
  );
  const [screenshotCount, storybookScreenshotCount, shards] = await Promise.all(
    [
      countQuery.resultSize(),
      countQuery
        .clone()
        .where(ref("metadata:sdk.name").castText(), ARGOS_STORYBOOK_SDK_NAME)
        .resultSize(),
      BuildShard.query(trx).select("metadata").where("buildId", build.id),
    ],
  );

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
    build.$relatedQuery("compareScreenshotBucket", trx).patch({
      complete: true,
      screenshotCount,
      storybookScreenshotCount,
      valid,
    }),
  ]);
}
