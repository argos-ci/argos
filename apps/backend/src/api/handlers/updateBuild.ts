import { invariant } from "@argos/util/invariant";
import express from "express";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { job as buildJob } from "@/build/index.js";
import { raw, transaction } from "@/database/index.js";
import {
  Build,
  BuildShard,
  Project,
  Screenshot,
} from "@/database/models/index.js";
import { insertFilesAndScreenshots } from "@/database/services/screenshots.js";
import { getRedisLock } from "@/util/redis";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { BuildSchema, serializeBuilds } from "../schema/primitives/build.js";
import { ScreenshotInputSchema } from "../schema/primitives/screenshot.js";
import {
  conflict,
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error.js";
import { z } from "../schema/util/zod.js";
import { CreateAPIHandler } from "../util.js";

const RequestBodySchema = z
  .object({
    screenshots: z.array(ScreenshotInputSchema),
    parallel: z.boolean().nullable().optional(),
    parallelTotal: z.number().int().min(1).nullable().optional(),
    parallelIndex: z.number().int().min(1).nullable().optional(),
  })
  .strict();

type RequestBody = z.infer<typeof RequestBodySchema>;

export const updateBuildOperation = {
  operationId: "updateBuild",
  requestParams: {
    path: z.object({
      buildId: z.string().openapi({
        description: "A unique identifier for the build",
        example: "12345",
        ref: "buildId",
      }),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: RequestBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "Result of build update",
      content: {
        "application/json": {
          schema: z.object({ build: BuildSchema }).strict(),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "409": conflict,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const updateBuild: CreateAPIHandler = ({ put }) => {
  return put(
    "/builds/{buildId}",
    repoAuth,
    // Temporary increase the limit
    // we should find a way to split the upload in several requests
    express.json({ limit: "1mb" }),
    async (req, res) => {
      if (!req.authProject) {
        throw boom(401, "Unauthorized");
      }

      const buildId = req.params["buildId"];

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

      const ctx = {
        project: req.authProject,
        build,
        body: req.body,
      } satisfies Context;
      if (req.body.parallel) {
        await handleUpdateParallel(ctx);
      } else {
        await handleUpdateSingle(ctx);
      }

      const [buildResponse] = await serializeBuilds([build]);
      invariant(buildResponse);

      res.send({ build: buildResponse });
    },
  );
};

type Context = {
  body: RequestBody;
  project: Project;
  build: Build;
};

/**
 * Parallel build update.
 */
async function handleUpdateParallel(ctx: Context) {
  const { body, build } = ctx;
  if (!body.parallelTotal) {
    throw boom(400, "`parallelTotal` is required when `parallel` is `true`");
  }

  const parallelTotal = body.parallelTotal;

  if (build.totalBatch && build.totalBatch !== parallelTotal) {
    throw boom(400, "`parallelTotal` must be the same on every batch");
  }

  const lock = await getRedisLock();
  const complete = await lock.acquire(
    ["update-build-parallel", build.id],
    async () => {
      return transaction(async (trx) => {
        const [shard, patchedBuild] = await Promise.all([
          body.parallelIndex != null
            ? BuildShard.query(trx).insert({
                buildId: build.id,
                index: body.parallelIndex,
              })
            : null,
          Build.query(trx)
            .patchAndFetchById(build.id, {
              batchCount: raw('"batchCount" + 1'),
              totalBatch: parallelTotal,
            })
            .select("batchCount"),
        ]);

        await insertFilesAndScreenshots({
          screenshots: body.screenshots,
          build,
          shard,
          trx,
        });

        if (parallelTotal === patchedBuild.batchCount) {
          const screenshotCount = await Screenshot.query(trx)
            .where("screenshotBucketId", build.compareScreenshotBucketId)
            .resultSize();
          await Promise.all([
            build
              .$relatedQuery("compareScreenshotBucket", trx)
              .patch({ complete: true, screenshotCount }),
            // If the build was marked as partial, then it was obviously an error, we unmark it.
            build.partial
              ? Build.query(trx).where("id", build.id).patch({ partial: false })
              : null,
          ]);
          return true;
        }

        return false;
      });
    },
  );

  if (complete) {
    await buildJob.push(build.id);
  }
}

/**
 * Single build update.
 */
async function handleUpdateSingle(ctx: Context) {
  const { body, build } = ctx;
  await transaction(async (trx) => {
    const screenshotCount = await insertFilesAndScreenshots({
      screenshots: body.screenshots,
      build,
      trx,
    });

    await build
      .compareScreenshotBucket!.$query(trx)
      .patchAndFetch({ complete: true, screenshotCount });
  });
  await buildJob.push(build.id);
}
