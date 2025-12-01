import { ref, TransactionOrKnex } from "objection";

import { transaction } from "@/database";
import { Build, BuildShard, Screenshot } from "@/database/models/index.js";
import { BuildMetadata } from "@/database/schemas/BuildMetadata";
import { ARGOS_STORYBOOK_SDK_NAME } from "@/util/argos-sdk";

/**
 * Check if the bucket is valid from the metadata.
 */
function checkIsBucketValidFromMetadata(metadata: BuildMetadata | null) {
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
  /**
   * Build to finalize.
   */
  build: Build;
  /**
   * Options passed when the build is a single one, it means no shards are involved.
   */
  single?: {
    metadata: BuildMetadata | null;
    screenshots: { all: number; storybook: number };
  };
  /**
   * Transaction object for database operations.
   */
  trx?: TransactionOrKnex;
}) {
  const { trx, build, single } = input;
  const countQuery = Screenshot.query(trx).where(
    "screenshotBucketId",
    build.compareScreenshotBucketId,
  );
  const [screenshotCount, storybookScreenshotCount, shards] = await Promise.all(
    [
      single?.screenshots.all ?? countQuery.resultSize(),
      single?.screenshots.storybook ??
        countQuery
          .clone()
          .where(ref("metadata:sdk.name").castText(), ARGOS_STORYBOOK_SDK_NAME)
          .resultSize(),
      single
        ? []
        : BuildShard.query(trx).select("metadata").where("buildId", build.id),
    ],
  );

  const buildData: Partial<Pick<Build, "metadata" | "finalizedAt">> = {
    finalizedAt: new Date().toISOString(),
  };

  if (single) {
    buildData.metadata = single.metadata;
  } else if (shards.length > 0) {
    buildData.metadata = aggregateMetadata(
      shards.map((shard) => shard.metadata),
    );
  }

  const valid = checkIsBucketValidFromMetadata(
    buildData.metadata ?? build.metadata,
  );

  await transaction(trx, async (trx) => {
    await Promise.all([
      build.$clone().$query(trx).patch(buildData),
      build.$relatedQuery("compareScreenshotBucket", trx).patch({
        complete: true,
        screenshotCount,
        storybookScreenshotCount,
        valid,
      }),
    ]);
  });
}
