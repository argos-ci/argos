import express, { Router } from "express";
// @ts-ignore
import { HttpError } from "express-err";

import { job as buildJob } from "@argos-ci/build";
import { raw, transaction } from "@argos-ci/database";
import { Build, Project } from "@argos-ci/database/models";
import {
  getUnknownScreenshotKeys,
  insertFilesAndScreenshots,
} from "@argos-ci/database/services/screenshots";

import { SHA256_REGEX_STR } from "../../../constants.js";
import { repoAuth } from "../../../middlewares/repoAuth.js";
import { validate } from "../../../middlewares/validate.js";
import { asyncHandler } from "../../../util.js";

const router = Router();
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
        nullable: true,
      },
      parallelTotal: {
        type: "integer",
        minimum: 1,
        nullable: true,
      },
    },
  },
});

type UpdateRequest = express.Request<
  {
    buildId?: string;
  },
  Record<string, never>,
  {
    commit: string;
    screenshots: {
      key: string;
      name: string;
    }[];
    parallel?: boolean;
    parallelTotal?: number;
  }
> & { authProject?: Project };

const handleUpdateParallel = async ({
  req,
  build,
  unknownKeys,
}: {
  req: UpdateRequest;
  build: Build;
  unknownKeys: string[];
}) => {
  if (!req.body.parallelTotal) {
    throw new HttpError(
      400,
      "`parallelTotal` is required when `parallel` is `true`"
    );
  }

  const parallelTotal = Number(req.body.parallelTotal);

  if (build.totalBatch && build.totalBatch !== parallelTotal) {
    throw new HttpError(400, "`parallelTotal` must be the same on every batch");
  }

  const complete = await transaction(async (trx) => {
    await insertFilesAndScreenshots({
      screenshots: req.body.screenshots,
      build,
      unknownKeys,
      trx,
    });

    await Build.query(trx)
      .findById(build.id)
      .patch({
        batchCount: raw('"batchCount" + 1'),
        totalBatch: parallelTotal,
      });

    if (parallelTotal === build.batchCount! + 1) {
      await build
        .$relatedQuery("compareScreenshotBucket", trx)
        .patch({ complete: true });
      return true;
    }

    return false;
  });

  if (complete) {
    await buildJob.push(build.id);
  }
};

const handleUpdateSingle = async ({
  req,
  build,
  unknownKeys,
}: {
  req: UpdateRequest;
  build: Build;
  unknownKeys: string[];
}) => {
  await transaction(async (trx) => {
    await insertFilesAndScreenshots({
      screenshots: req.body.screenshots,
      build,
      unknownKeys,
      trx,
    });

    await build
      .compareScreenshotBucket!.$query(trx)
      .patchAndFetch({ complete: true });
  });
  await buildJob.push(build.id);
};

router.put(
  "/builds/:buildId",
  repoAuth,
  // Temporary increase the limit
  // we should find a way to split the upload in several requests
  express.json({ limit: "1mb" }),
  validateRoute,
  asyncHandler(async (req: UpdateRequest, res) => {
    const buildId = Number(req.params["buildId"]);

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

    if (build.projectId !== req.authProject!.id) {
      throw new HttpError(403, "Build does not belong to project");
    }

    const screenshots = req.body.screenshots;
    const screenshotKeys = screenshots.map((screenshot) => screenshot.key);
    const unknownKeys = await getUnknownScreenshotKeys(screenshotKeys);

    const ctx = { req, build, unknownKeys };
    if (req.body.parallel) {
      await handleUpdateParallel(ctx);
    } else {
      await handleUpdateSingle(ctx);
    }

    const buildUrl = await build.getUrl();

    res.send({ build: { id: build.id, url: buildUrl } });
  })
);
