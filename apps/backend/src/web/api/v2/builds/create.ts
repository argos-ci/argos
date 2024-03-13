import { invariant } from "@argos/util/invariant";
import express, { Router } from "express";

import config from "@/config/index.js";
import type { Project } from "@/database/models/index.js";
import { Build } from "@/database/models/index.js";
import { getUnknownFileKeys } from "@/database/services/file.js";
import { getS3Client, getSignedPutObjectUrl } from "@/storage/index.js";
import { getRedisLock } from "@/util/redis/index.js";
import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "@/web/constants.js";

import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { asyncHandler, boom } from "../../../util.js";
import { createBuildFromRequest, getBuildName } from "../util.js";

const router = Router();
export default router;

const validateRoute = validate({
  body: {
    type: "object",
    required: ["commit", "branch", "screenshotKeys"],
    properties: {
      commit: {
        type: "string",
        pattern: SHA1_REGEX_STR,
      },
      screenshotKeys: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", pattern: SHA256_REGEX_STR },
      },
      pwTraceKeys: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", pattern: SHA256_REGEX_STR },
      },
      branch: {
        type: "string",
      },
      name: {
        type: "string",
        nullable: true,
      },
      parallel: {
        type: "boolean",
        nullable: true,
      },
      parallelNonce: {
        type: "string",
        nullable: true,
      },
      prNumber: {
        type: "integer",
        minimum: 1,
        nullable: true,
      },
      prHeadCommit: {
        type: "string",
        nullable: true,
      },
      referenceCommit: {
        type: "string",
        nullable: true,
      },
      referenceBranch: {
        type: "string",
        nullable: true,
      },
    },
  },
});

type RequestPayload = {
  commit: string;
  screenshotKeys: string[];
  pwTraceKeys?: string[];
  branch: string;
  name?: string | null;
  parallel?: string | null;
  parallelNonce?: string | null;
  prNumber: number | null;
  prHeadCommit?: string | null;
  referenceCommit?: string | null;
  referenceBranch?: string | null;
};

type CreateRequest = express.Request<
  Record<string, never>,
  Record<string, never>,
  RequestPayload
> & { authProject: Project };

type Upload = {
  key: string;
  putUrl: string;
};

const getUploads = async (keys: string[]): Promise<Upload[]> => {
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
};

const getScreenshotAndPwTraces = async (params: {
  screenshotKeys: string[];
  pwTraceKeys?: string[];
}): Promise<{ screenshots: Upload[]; pwTraces: Upload[] }> => {
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
};

type CreateResult = {
  build: Build;
  screenshots: Upload[];
  pwTraces: Upload[];
};

const handleCreateSingle = async ({
  req,
}: {
  req: CreateRequest;
}): Promise<CreateResult> => {
  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(req.body);
  const build = await createBuildFromRequest({ req });
  return { build, screenshots, pwTraces };
};

const handleCreateParallel = async ({
  req,
}: {
  req: CreateRequest;
}): Promise<CreateResult> => {
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
      if (existingBuild.compareScreenshotBucket!.complete) {
        throw boom(409, `Build already finalized`);
      }

      return existingBuild;
    }

    return createBuildFromRequest({ req });
  });

  return { build, screenshots, pwTraces };
};

router.post(
  "/builds",
  repoAuth,
  // Temporary increase the limit
  // we should find a way to split the upload in several requests
  express.json({ limit: "1mb" }),
  validateRoute,
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
