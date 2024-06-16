import { invariant } from "@argos/util/invariant";
import express, { Router } from "express";

import config from "@/config/index.js";
import { Build } from "@/database/models/index.js";
import { getUnknownFileKeys } from "@/database/services/file.js";
import { getS3Client, getSignedPutObjectUrl } from "@/storage/index.js";
import { getRedisLock } from "@/util/redis/index.js";

import { repoAuth } from "../../../middlewares/repoAuth.js";
import { asyncHandler, boom } from "../../../util.js";
import {
  createBuildFromRequest,
  CreateRequest,
  getBuildName,
  validateCreateRequest,
} from "../util.js";

const router = Router();
export default router;

type Upload = {
  key: string;
  putUrl: string;
};

async function getUploads(keys: string[]): Promise<Upload[]> {
  const unknownKeys = await getUnknownFileKeys(keys);
  const s3 = getS3Client();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  const putUrls = await Promise.all(
    unknownKeys.map((key) =>
      getSignedPutObjectUrl({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
        expiresIn: 1800, // 30 minutes
      }),
    ),
  );
  return unknownKeys.map((key, index) => {
    const putUrl = putUrls[index];
    invariant(putUrl, "`putUrl` is undefined");
    return { key, putUrl };
  });
}

async function getScreenshotAndPwTraces(params: {
  screenshotKeys: string[];
  pwTraceKeys?: string[];
}): Promise<{ screenshots: Upload[]; pwTraces: Upload[] }> {
  const screenshotKeys = params.screenshotKeys;
  const pwTraceKeys = params.pwTraceKeys ?? [];
  const fileKeys = [...params.screenshotKeys, ...pwTraceKeys];
  const uploads = await getUploads(fileKeys);
  return {
    screenshots: uploads.filter((upload) =>
      screenshotKeys.includes(upload.key),
    ),
    pwTraces: uploads.filter((upload) => pwTraceKeys.includes(upload.key)),
  };
}

type CreateResult = {
  build: Build;
  screenshots: Upload[];
  pwTraces: Upload[];
};

async function handleCreateSingle({
  req,
}: {
  req: CreateRequest;
}): Promise<CreateResult> {
  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(req.body);
  const build = await createBuildFromRequest({ req });
  return { build, screenshots, pwTraces };
}

async function handleCreateParallel({
  req,
}: {
  req: CreateRequest;
}): Promise<CreateResult> {
  if (!req.body.parallelNonce) {
    throw boom(400, "`parallelNonce` is required when `parallel` is `true`");
  }
  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(req.body);
  const buildName = getBuildName(req.body.name);
  const parallelNonce = req.body.parallelNonce;

  const lockKey = `${req.authProject.id}:${req.body.commit}:${buildName}:${parallelNonce}`;
  const lock = await getRedisLock();
  const build = await lock.acquire(lockKey, async () => {
    const existingBuild = await Build.query()
      .withGraphFetched("compareScreenshotBucket")
      .findOne({
        "builds.projectId": req.authProject.id,
        externalId: parallelNonce,
        name: getBuildName(req.body.name),
      });

    if (existingBuild) {
      invariant(existingBuild.compareScreenshotBucket, "Bucket should exist");
      if (existingBuild.compareScreenshotBucket.complete) {
        throw boom(409, `Build already finalized`);
      }

      return existingBuild;
    }

    return createBuildFromRequest({ req });
  });

  return { build, screenshots, pwTraces };
}

router.post(
  "/builds",
  repoAuth,
  // Temporary increase the limit
  // we should find a way to split the upload in several requests
  express.json({ limit: "1mb" }),
  validateCreateRequest,
  asyncHandler(async (req, res) => {
    const { build, screenshots, pwTraces } = await (async () => {
      const ctx = { req } as { req: CreateRequest };
      if (req.body.parallel) {
        return handleCreateParallel(ctx);
      } else {
        return handleCreateSingle(ctx);
      }
    })();

    const buildUrl = await build.getUrl();

    res
      .status(201)
      .send({ build: { id: build.id, url: buildUrl }, screenshots, pwTraces });
  }),
);
