import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { finalizeBuild } from "@/build/finalizeBuild.js";
import { job as buildJob } from "@/build/index.js";
import { raw, transaction } from "@/database/index.js";
import { Build, BuildShard, Project } from "@/database/models/index.js";
import { BuildMetadataSchema } from "@/database/schemas/BuildMetadata.js";
import { insertFilesAndScreenshots } from "@/database/services/screenshots.js";
import { redisLock } from "@/util/redis";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import {
  BuildIdSchema,
  BuildSchema,
  serializeBuilds,
} from "../schema/primitives/build.js";
import { ScreenshotInputSchema } from "../schema/primitives/screenshot.js";
import {
  conflict,
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error.js";
import { CreateAPIHandler } from "../util.js";

const RequestBodySchema = z.object({
  screenshots: z.array(ScreenshotInputSchema),
  parallel: z.boolean().nullable().optional(),
  parallelTotal: z.number().int().min(-1).nullable().optional(),
  parallelIndex: z.number().int().min(1).nullable().optional(),
  metadata: BuildMetadataSchema.optional().meta({
    description: "Build metadata",
    id: "BuildMetadata",
  }),
});

type RequestBody = z.infer<typeof RequestBodySchema>;

export const updateBuildOperation = {
  operationId: "updateBuild",
  requestParams: {
    path: z.object({
      buildId: BuildIdSchema,
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
          schema: z.object({ build: BuildSchema }),
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
  return put("/builds/{buildId}", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const buildId = req.ctx.params["buildId"];

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("headArtifactBucket");

    if (!build) {
      throw boom(404, "Build not found");
    }

    if (!build.headArtifactBucket) {
      throw boom(500, "Could not find headArtifactBucket for build");
    }

    if (build.headArtifactBucket.complete) {
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
  });
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
  const parallelTotal =
    typeof body.parallelTotal === "number" ? body.parallelTotal : null;
  const expectedTotal =
    parallelTotal !== null && parallelTotal > 0 ? parallelTotal : null;

  if (expectedTotal && build.totalBatch && build.totalBatch !== expectedTotal) {
    throw boom(400, "`parallelTotal` must be the same on every batch");
  }

  const complete = await redisLock.acquire(
    ["update-build-parallel", build.id],
    async () => {
      return transaction(async (trx) => {
        const [shard, patchedBuild] = await Promise.all([
          body.parallelIndex != null
            ? BuildShard.query(trx).insert({
                buildId: build.id,
                index: body.parallelIndex,
                metadata: body.metadata ?? null,
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
          artifacts: body.screenshots,
          build,
          shard,
          trx,
        });

        if (expectedTotal && expectedTotal === patchedBuild.batchCount) {
          await Promise.all([
            finalizeBuild({ build, trx }),
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
  const metadata = ctx.body.metadata ?? null;
  await transaction(async (trx) => {
    const screenshots = await insertFilesAndScreenshots({
      screenshots: body.screenshots,
      build,
      trx,
    });
    await finalizeBuild({ trx, build, single: { metadata, screenshots } });
  });
  await buildJob.push(build.id);
}
