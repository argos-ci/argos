import express, { Router } from "express";

import { job as buildJob } from "@/build/index.js";
import { raw, transaction } from "@/database/index.js";
import {
  Build,
  Project,
  Screenshot,
  ScreenshotMetadata,
  ScreenshotMetadataJsonSchema,
} from "@/database/models/index.js";
import { insertFilesAndScreenshots } from "@/database/services/screenshots.js";
import { SHA256_REGEX_STR } from "@/web/constants.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { validate } from "@/web/middlewares/validate.js";
import { asyncHandler, boom } from "@/web/util.js";

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
            metadata: ScreenshotMetadataJsonSchema,
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
      metadata?: ScreenshotMetadata | null;
      pwTraceKey?: string | null;
    }[];
    parallel?: boolean;
    parallelTotal?: number;
  }
> & { authProject?: Project };

const handleUpdateParallel = async ({
  req,
  build,
}: {
  req: UpdateRequest;
  build: Build;
}) => {
  if (!req.body.parallelTotal) {
    throw boom(400, "`parallelTotal` is required when `parallel` is `true`");
  }

  const parallelTotal = Number(req.body.parallelTotal);

  if (build.totalBatch && build.totalBatch !== parallelTotal) {
    throw boom(400, "`parallelTotal` must be the same on every batch");
  }

  const complete = await transaction(async (trx) => {
    await insertFilesAndScreenshots({
      screenshots: req.body.screenshots,
      build,
      trx,
    });

    await Build.query(trx)
      .findById(build.id)
      .patch({
        batchCount: raw('"batchCount" + 1'),
        totalBatch: parallelTotal,
      });

    if (parallelTotal === build.batchCount! + 1) {
      const screenshotCount = await Screenshot.query(trx)
        .where("screenshotBucketId", build.compareScreenshotBucketId)
        .resultSize();
      await build
        .$relatedQuery("compareScreenshotBucket", trx)
        .patch({ complete: true, screenshotCount });
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
}: {
  req: UpdateRequest;
  build: Build;
}) => {
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
