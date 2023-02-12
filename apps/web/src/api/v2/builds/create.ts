import express, { Router } from "express";
// @ts-ignore
import { HttpError } from "express-err";
import type { TransactionOrKnex } from "objection";

import { pushBuildNotification } from "@argos-ci/build-notification";
import config from "@argos-ci/config";
import { transaction } from "@argos-ci/database";
import type { Repository } from "@argos-ci/database/models";
import { Account, Build, ScreenshotBucket } from "@argos-ci/database/models";
import { s3 as getS3, getSignedPutObjectUrl } from "@argos-ci/storage";

import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "../../../constants.js";
import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { getRedisLock } from "../../../redis/index.js";
import { asyncHandler } from "../../../util.js";
import { getUnknownScreenshotKeys } from "./util.js";

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
> & { authRepository: Repository };

const getBuildName = (req: CreateRequest) => req.body.name || "default";

const getBucketData = (req: CreateRequest) => {
  return {
    name: getBuildName(req),
    commit: req.body.commit,
    branch: req.body.branch,
    repositoryId: req.authRepository.id,
  };
};

const getBuildData = (req: CreateRequest) => {
  const parallel = req.body.parallel;
  return {
    jobStatus: "pending" as const,
    baseScreenshotBucketId: null,
    externalId: parallel ? req.body.parallelNonce ?? null : null,
    batchCount: parallel ? 0 : null,
    repositoryId: req.authRepository.id,
    name: getBuildName(req),
    prNumber: req.body.prNumber ?? null,
  };
};

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

const createBuild = async ({
  req,
  trx,
}: {
  req: CreateRequest;
  trx?: TransactionOrKnex;
}) => {
  if (req.authRepository.private || req.authRepository.forcedPrivate) {
    const account = await Account.getAccount(req.authRepository);
    const hasExceedLimit = await account.hasExceedScreenshotsMonthlyLimit();
    if (hasExceedLimit) {
      throw new HttpError(
        402,
        `Build rejected for insufficient credit. Please upgrade Argos plan.`
      );
    }
  }

  return transaction(trx, async (trx) => {
    const bucketData = {
      ...getBucketData(req),
      complete: false,
    };
    const bucket = await ScreenshotBucket.query(trx).insertAndFetch(bucketData);

    const buildData = {
      ...getBuildData(req),
      compareScreenshotBucketId: bucket.id,
    };
    const build = await Build.query(trx).insertAndFetch(buildData);

    await pushBuildNotification({
      buildId: build.id,
      type: "queued",
      trx,
    });

    return build;
  });
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
  const buildName = getBuildName(req);
  const parallelNonce = req.body.parallelNonce;

  const lockKey = `${req.authRepository.id}:${req.body.commit}:${buildName}:${parallelNonce}`;
  const lock = await getRedisLock();
  const build = await lock.acquire(lockKey, async () => {
    return transaction(async (trx) => {
      const existingBuild = await Build.query(trx)
        .withGraphFetched("compareScreenshotBucket")
        .findOne({
          "builds.repositoryId": req.authRepository.id,
          externalId: parallelNonce,
          name: getBuildName(req),
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
