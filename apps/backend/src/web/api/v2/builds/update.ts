import express, { Router } from "express";

import { job as buildJob } from "@/build/index.js";
import { raw, transaction } from "@/database/index.js";
import { Build, BuildShard, Screenshot } from "@/database/models/index.js";
import { insertFilesAndScreenshots } from "@/database/services/screenshots.js";
import { getRedisLock } from "@/util/redis";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { asyncHandler, boom } from "@/web/util.js";

import { UpdateRequest, validateUpdateRequest } from "../util";

const router = Router();
export default router;

async function handleUpdateParallel({
  req,
  build,
}: {
  req: UpdateRequest;
  build: Build;
}) {
  if (!req.body.parallelTotal) {
    throw boom(400, "`parallelTotal` is required when `parallel` is `true`");
  }

  const parallelTotal = Number(req.body.parallelTotal);

  if (build.totalBatch && build.totalBatch !== parallelTotal) {
    throw boom(400, "`parallelTotal` must be the same on every batch");
  }

  const lockKey = `build.${build.id}.parallel`;
  const lock = await getRedisLock();
  const complete = await lock.acquire(lockKey, async () => {
    return transaction(async (trx) => {
      const [shard, patchedBuild] = await Promise.all([
        typeof req.body.parallelIndex === "number"
          ? BuildShard.query(trx).insert({
              buildId: build.id,
              index: req.body.parallelIndex,
            })
          : null,
        Build.query(trx)
          .patchAndFetchById(build.id, {
            batchCount: raw('"batchCount" + 1'),
            totalBatch: parallelTotal,
          })
          .select("batchCount"),
      ]);

      await insertFilesAndScreenshots({
        screenshots: req.body.screenshots,
        build,
        shard,
        trx,
      });

      if (parallelTotal === patchedBuild.batchCount) {
        const screenshotCount = await Screenshot.query(trx)
          .where("screenshotBucketId", build.compareScreenshotBucketId)
          .resultSize();
        await Promise.all([
          build
            .$relatedQuery("compareScreenshotBucket", trx)
            .patch({ complete: true, screenshotCount }),
          // If the build was marked as partial, then it was obviously an error, we unmark it.
          build.partial
            ? Build.query(trx).where("id", build.id).patch({ partial: false })
            : null,
        ]);
        return true;
      }

      return false;
    });
  });

  if (complete) {
    await buildJob.push(build.id);
  }
}

async function handleUpdateSingle({
  req,
  build,
}: {
  req: UpdateRequest;
  build: Build;
}) {
  await transaction(async (trx) => {
    const screenshotCount = await insertFilesAndScreenshots({
      screenshots: req.body.screenshots,
      build,
      trx,
    });

    await build
      .compareScreenshotBucket!.$query(trx)
      .patchAndFetch({ complete: true, screenshotCount });
  });
  await buildJob.push(build.id);
}

router.put(
  "/builds/:buildId",
  repoAuth,
  // Temporary increase the limit
  // we should find a way to split the upload in several requests
  express.json({ limit: "1mb" }),
  validateUpdateRequest,
  asyncHandler(async (req: UpdateRequest, res) => {
    const buildId = Number(req.params["buildId"]);

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("compareScreenshotBucket");

    if (!build) {
      throw boom(404, "Build not found");
    }

    if (!build.compareScreenshotBucket) {
      throw boom(500, "Could not find compareScreenshotBucket for build");
    }

    if (build.compareScreenshotBucket.complete) {
      throw boom(409, "Build is already finalized");
    }

    if (build.projectId !== req.authProject!.id) {
      throw boom(403, "Build does not belong to project");
    }

    const ctx = { req, build };
    if (req.body.parallel) {
      await handleUpdateParallel(ctx);
    } else {
      await handleUpdateSingle(ctx);
    }

    const buildUrl = await build.getUrl();

    res.send({ build: { id: build.id, url: buildUrl } });
  }),
);
