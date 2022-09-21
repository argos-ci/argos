import { HttpError } from "express-err";
import express from "express";
import { transaction } from "@argos-ci/database";
import { Build, ScreenshotBucket } from "@argos-ci/database/models";
import { s3 as getS3, getSignedPutObjectUrl } from "@argos-ci/storage";
import config from "@argos-ci/config";
import { pushBuildNotification } from "@argos-ci/build-notification";
import { asyncHandler } from "../../../util";
import { repoAuth } from "../../../middlewares/repoAuth";
import { getRedisLock } from "../../../redis";
import { validate } from "../../../middlewares/validate";
import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "../../../constants";
import { getUnknownScreenshotKeys } from "./util";

const router = express.Router();
export default router;

const validateRoute = validate({
  body: {
    type: "object",
    required: ["commit", "screenshotKeys"],
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
        nullable: true,
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
    },
  },
});

const getBuildName = (req) => req.body.name || "default";

const getBucketData = (req) => {
  return {
    name: getBuildName(req),
    commit: req.body.commit,
    branch: req.body.branch || null,
    repositoryId: req.authRepository.id,
  };
};

const getBuildData = (req) => {
  const parallel = req.body.parallel;
  return {
    jobStatus: "pending",
    baseScreenshotBucketId: null,
    externalId: parallel ? req.body.parallelNonce : null,
    batchCount: parallel ? 0 : null,
    repositoryId: req.authRepository.id,
    name: getBuildName(req),
  };
};

const getScreenshots = async (keys) => {
  const unknownKeys = await getUnknownScreenshotKeys(keys);
  const s3 = getS3();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  const signedUrls = await Promise.all(
    unknownKeys.map((key) =>
      getSignedPutObjectUrl({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
        expiresIn: 180,
      })
    )
  );
  return unknownKeys.map((key, index) => ({
    key,
    putUrl: signedUrls[index],
  }));
};

const createBuild = async ({ req, trx }) => {
  return transaction(trx, async (trx) => {
    const bucket = await ScreenshotBucket.query(trx).insertAndFetch({
      ...getBucketData(req),
      complete: false,
    });

    const build = await Build.query(trx).insertAndFetch({
      ...getBuildData(req),
      compareScreenshotBucketId: bucket.id,
    });

    await pushBuildNotification({
      buildId: build.id,
      type: "queued",
      trx,
    });

    return build;
  });
};

const handleCreateSingle = async ({ req }) => {
  const screenshots = await getScreenshots(req.body.screenshotKeys);
  const build = await createBuild({ req });
  return { build, screenshots };
};

const handleCreateParallel = async ({ req }) => {
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
  const lock = getRedisLock();
  const build = await lock(lockKey, async () => {
    return transaction(async (trx) => {
      const existingBuild = await Build.query(trx)
        .withGraphFetched("compareScreenshotBucket")
        .findOne({
          "builds.repositoryId": req.authRepository.id,
          externalId: parallelNonce,
          name: getBuildName(req),
        });

      if (existingBuild) {
        if (existingBuild.compareScreenshotBucket.complete) {
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
  express.json(),
  validateRoute,
  asyncHandler(async (req, res) => {
    const { build, screenshots } = await (async () => {
      const ctx = { req };
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
