import express, { Router } from "express";
// @ts-ignore
import { HttpError } from "express-err";

import { getRedisLock } from "@/util/redis/index.js";
import config from "@/config/index.js";
import type { Project } from "@/database/models/index.js";
import { Build } from "@/database/models/index.js";
import { getUnknownFileKeys } from "@/database/services/file.js";
import { getS3Client, getSignedPutObjectUrl } from "@/storage/index.js";

import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "@/web/constants.js";
import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { asyncHandler } from "../../../util.js";
import { createBuildFromRequest, getBuildName } from "../util.js";
import { invariant } from "@/util/invariant.js";

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
      pwTraces: {
        type: "array",
        items: {
          type: "object",
          required: ["screenshotKey", "traceKey"],
          properties: {
            screenshotKey: { type: "string", pattern: SHA256_REGEX_STR },
            traceKey: { type: "string", pattern: SHA256_REGEX_STR },
          },
        },
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

type PayloadPwTrace = { screenshotKey: string; traceKey: string };

type RequestPayload = {
  commit: string;
  screenshotKeys: string[];
  pwTraces?: PayloadPwTrace[];
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

const getScreenshots = async (
  keys: string[],
  pwTraces: PayloadPwTrace[],
): Promise<
  {
    key: string;
    putUrl: string;
    putTraceUrl: string | null;
  }[]
> => {
  const pwTraceKeys = pwTraces.map((pwTrace) => pwTrace.traceKey);
  const allKeys = [...keys, ...pwTraceKeys];
  const unknownKeys = await getUnknownFileKeys(allKeys);
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
  const putUrlByKey = Object.fromEntries(
    unknownKeys.map((key, index) => [key, putUrls[index]]),
  );
  const screenshotUnknownKeys = unknownKeys.filter((key) => keys.includes(key));
  return screenshotUnknownKeys.map((key) => {
    const putUrl = putUrlByKey[key];
    invariant(putUrl, `putUrl missing for key ${key}`);
    const trace = pwTraces.find((pwTrace) => pwTrace.screenshotKey === key);
    const putTraceUrl = trace ? putUrlByKey[trace.traceKey] ?? null : null;
    return {
      key,
      putUrl,
      putTraceUrl,
    };
  });
};

const handleCreateSingle = async ({ req }: { req: CreateRequest }) => {
  const screenshots = await getScreenshots(
    req.body.screenshotKeys,
    req.body.pwTraces ?? [],
  );
  const build = await createBuildFromRequest({ req });
  return { build, screenshots };
};

const handleCreateParallel = async ({ req }: { req: CreateRequest }) => {
  if (!req.body.parallelNonce) {
    throw new HttpError(
      400,
      "`parallelNonce` is required when `parallel` is `true`",
    );
  }
  const screenshots = await getScreenshots(
    req.body.screenshotKeys,
    req.body.pwTraces ?? [],
  );
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
        throw new HttpError(409, `Build already finalized`);
      }

      return existingBuild;
    }

    return createBuildFromRequest({ req });
  });

  return { build, screenshots };
};

router.post(
  "/builds",
  repoAuth,
  // Temporary increase the limit
  // we should find a way to split the upload in several requests
  express.json({ limit: "1mb" }),
  validateRoute,
  asyncHandler(async (req, res) => {
    const { build, screenshots } = await (async () => {
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
      .send({ build: { id: build.id, url: buildUrl }, screenshots });
  }),
);
