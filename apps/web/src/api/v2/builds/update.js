import { HttpError } from "express-err";
import express from "express";
import { transaction, raw } from "@argos-ci/database";
import { Build, Screenshot } from "@argos-ci/database/models";
import { s3 as getS3, checkIfExists } from "@argos-ci/storage";
import config from "@argos-ci/config";
import { job as buildJob } from "@argos-ci/build";
import { asyncHandler } from "../../../util";
import { repoAuth } from "../../../middlewares/repoAuth";
import { mustBeEnabledAuthRepo, getUnknownScreenshotKeys } from "./util";
import { validate } from "../../../middlewares/validate";
import { SHA256_REGEX_STR } from "../../../constants";

const router = express.Router();
export default router;

const validateRoute = validate({
  params: {
    type: "object",
    required: ["buildId"],
    properties: {
      buildId: {
        type: "integer",
      },
    },
  },
  body: {
    type: "object",
    required: ["screenshots"],
    properties: {
      screenshots: {
        type: "array",
        uniqueItems: true,
        items: {
          type: "object",
          required: ["key", "name"],
          properties: {
            key: {
              type: "string",
              pattern: SHA256_REGEX_STR,
            },
            name: {
              type: "string",
            },
          },
        },
      },
      parallel: {
        type: "boolean",
      },
      parallelTotal: {
        type: "integer",
        minimum: 1,
      },
    },
  },
});

const checkAllScreenshotKeysExist = async (keys) => {
  const unknownKeys = await getUnknownScreenshotKeys(keys);

  const s3 = getS3();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  const exists = await Promise.all(
    unknownKeys.map((key) =>
      checkIfExists({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
      })
    )
  );
  const missingKeys = unknownKeys.filter((_key, index) => !exists[index]);
  if (missingKeys.length > 0) {
    throw new HttpError(
      400,
      `Missing screenshots for keys: ${missingKeys.join(", ")}`
    );
  }
};

const insertScreenshots = async ({ req, build, trx }) => {
  await Screenshot.query(trx).insert(
    req.body.screenshots.map((screenshot) => ({
      screenshotBucketId: build.compareScreenshotBucket.id,
      name: screenshot.name,
      s3Id: screenshot.key,
    }))
  );
};

const handleUpdateParallel = async ({ req, build }) => {
  if (!req.body.parallelTotal) {
    throw new HttpError(
      400,
      "`parallelTotal` is required when `parallel` is `true`"
    );
  }

  const parallelTotal = Number(req.body.parallelTotal);

  await transaction(async (trx) => {
    await insertScreenshots({ req, build, trx });

    await build
      .$query(trx)
      .patchAndFetch({ batchCount: raw('"batchCount" + 1') });

    if (parallelTotal === build.batchCount) {
      await build.compareScreenshotBucket
        .$query(trx)
        .patchAndFetch({ complete: true });
    }
  });

  await buildJob.push(build.id);
};

const handleUpdateSingle = async ({ req, build }) => {
  await transaction(async (trx) => {
    await insertScreenshots({ req, build, trx });

    await build.compareScreenshotBucket
      .$query(trx)
      .patchAndFetch({ complete: true });
  });
  await buildJob.push(build.id);
};

router.put(
  "/builds/:buildId",
  repoAuth,
  mustBeEnabledAuthRepo,
  express.json(),
  validateRoute,
  asyncHandler(async (req, res) => {
    const buildId = Number(req.params.buildId);

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("compareScreenshotBucket");

    if (!build) {
      throw new HttpError(404, "Build not found");
    }

    if (!build.compareScreenshotBucket) {
      throw new HttpError(
        500,
        "Could not find compareScreenshotBucket for build"
      );
    }

    if (build.compareScreenshotBucket.complete) {
      throw new HttpError(409, "Build is already finalized");
    }

    if (build.repositoryId !== req.authRepository.id) {
      throw new HttpError(403, "Build does not belong to repository");
    }

    const screenshots = req.body.screenshots;
    const screenshotKeys = screenshots.map((screenshot) => screenshot.key);
    await checkAllScreenshotKeysExist(screenshotKeys);

    await (async () => {
      const ctx = { req, build };
      if (req.body.parallel) {
        return handleUpdateParallel(ctx);
      } else {
        return handleUpdateSingle(ctx);
      }
    })();

    const buildUrl = await build.getUrl();

    res.send({ build, buildUrl });
  })
);
