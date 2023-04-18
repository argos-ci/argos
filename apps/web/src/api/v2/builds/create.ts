import express, { Router } from "express";
// @ts-ignore
import { HttpError } from "express-err";

import config from "@argos-ci/config";
import { transaction } from "@argos-ci/database";
import type { Project } from "@argos-ci/database/models";
import { Build } from "@argos-ci/database/models";
import { getUnknownScreenshotKeys } from "@argos-ci/database/services/screenshots";
import { s3 as getS3, getSignedPutObjectUrl } from "@argos-ci/storage";

import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "../../../constants.js";
import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { getRedisLock } from "../../../redis/index.js";
import { asyncHandler } from "../../../util.js";
import { createBuild, getBuildName } from "../util.js";

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
    },
  },
});

type CreateRequest = express.Request<
  Record<string, never>,
  Record<string, never>,
  {
    commit: string;
    screenshotKeys: string[];
    branch: string;
    name?: string | null;
    parallel?: string | null;
    parallelNonce?: string | null;
    prNumber: number | null;
  }
> & { authProject: Project };

const getScreenshots = async (keys: string[]) => {
  const unknownKeys = await getUnknownScreenshotKeys(keys);
  const s3 = getS3();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  const signedUrls = await Promise.all(
    unknownKeys.map((key) =>
      getSignedPutObjectUrl({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
        expiresIn: 1800, // 30 minutes
      })
    )
  );
  return unknownKeys.map((key, index) => ({
    key,
    putUrl: signedUrls[index],
  }));
};

const handleCreateSingle = async ({ req }: { req: CreateRequest }) => {
  const screenshots = await getScreenshots(req.body.screenshotKeys);
  const build = await createBuild({ req });
  return { build, screenshots };
};

const handleCreateParallel = async ({ req }: { req: CreateRequest }) => {
  if (!req.body.parallelNonce) {
    throw new HttpError(
      400,
      "`parallelNonce` is required when `parallel` is `true`"
    );
  }
  const screenshots = await getScreenshots(req.body.screenshotKeys);
  const buildName = getBuildName(req.body.name);
  const parallelNonce = req.body.parallelNonce;

  const lockKey = `${req.authProject.id}:${req.body.commit}:${buildName}:${parallelNonce}`;
  const lock = await getRedisLock();
  const build = await lock.acquire(lockKey, async () => {
    return transaction(async (trx) => {
      const existingBuild = await Build.query(trx)
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

      return createBuild({ req, trx });
    });
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
  })
);
