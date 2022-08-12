import { HttpError } from "express-err";
import express from "express";
import { transaction, raw } from "@argos-ci/database";
import { Build, Screenshot, File } from "@argos-ci/database/models";
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

const checkAllScreenshotKeysExist = async (unknownKeys) => {
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

const insertFilesAndScreenshots = async ({ req, build, unknownKeys, trx }) => {
  await transaction(trx, async (trx) => {
    // Insert unknown files
    await File.query(trx).insert(unknownKeys.map((key) => ({ key })));

    // Retrieve all screenshot files
    const screenshots = req.body.screenshots;
    const screenshotKeys = screenshots.map((screenshot) => screenshot.key);
    const files = await File.query(trx).whereIn("key", screenshotKeys);

    // Insert screenshots
    await Screenshot.query(trx).insert(
      screenshots.map((screenshot) => ({
        screenshotBucketId: build.compareScreenshotBucket.id,
        name: screenshot.name,
        s3Id: screenshot.key,
        fileId: files.find((file) => file.key === screenshot.key).id,
      }))
    );
  });
};

const handleUpdateParallel = async ({ req, build, unknownKeys }) => {
  if (!req.body.parallelTotal) {
    throw new HttpError(
      400,
      "`parallelTotal` is required when `parallel` is `true`"
    );
  }

  const parallelTotal = Number(req.body.parallelTotal);

  await transaction(async (trx) => {
    await insertFilesAndScreenshots({ req, build, unknownKeys, trx });

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

const handleUpdateSingle = async ({ req, build, unknownKeys }) => {
  await transaction(async (trx) => {
    await insertFilesAndScreenshots({ req, build, unknownKeys, trx });

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
    const unknownKeys = await getUnknownScreenshotKeys(screenshotKeys);
    await checkAllScreenshotKeysExist(unknownKeys);

    await (async () => {
      const ctx = { req, build, unknownKeys };
      if (req.body.parallel) {
        return handleUpdateParallel(ctx);
      } else {
        return handleUpdateSingle(ctx);
      }
    })();

    const buildUrl = await build.getUrl();

    res.send({ build: { id: build.id, url: buildUrl } });
  })
);
