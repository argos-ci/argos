import { BuildMetadataSchema } from "@argos/schemas/build-metadata";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { job as buildJob } from "@/build";
import { finalizeBuild } from "@/build/finalizeBuild";
import { raw, transaction } from "@/database";
import { Build, BuildShard, Project } from "@/database/models";
import { insertFilesAndScreenshots } from "@/database/services/screenshots";
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";

import {
  assertAuthAttributes,
  getAuthProjectPayloadFromExpressReq,
} from "../auth/project";
import {
  BuildIdSchema,
  BuildSchema,
  serializeBuild,
} from "../schema/primitives/build";
import { ScreenshotInputSchema } from "../schema/primitives/screenshot";
import {
  conflict,
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const RequestBodySchema = z.object({
  screenshots: z.array(ScreenshotInputSchema),
  parallel: z.boolean().nullish(),
  parallelTotal: z.number().int().min(-1).nullish(),
  parallelIndex: z.number().int().min(1).nullish(),
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
  return put("/builds/{buildId}", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);

    const { body, params } = req.ctx;
    const requestIdHeader = req.headers["x-argos-request-id"];
    const requestId =
      typeof requestIdHeader === "string" ? requestIdHeader : null;

    const buildId = params["buildId"];

    const build = await Build.query()
      .findById(buildId)
      .withGraphFetched("compareScreenshotBucket");

    if (!build) {
      throw boom(404, "Build not found");
    }

    if (!build.compareScreenshotBucket) {
      throw boom(500, "Could not find compareScreenshotBucket for build");
    }

    assertAuthAttributes(auth, {
      sha: build.compareScreenshotBucket.commit,
    });

    if (build.compareScreenshotBucket.complete) {
      const duplicateParallelRequest =
        body.parallel && requestId
          ? await hasShardBeenProcessed({ buildId: build.id, requestId })
          : false;
      if (duplicateParallelRequest) {
        res.send({
          build: await serializeBuild(build),
        });
        return;
      }
      throw boom(409, "Build is already finalized");
    }

    if (build.projectId !== auth.project.id) {
      throw boom(403, "Build does not belong to project");
    }

    const ctx = {
      project: auth.project,
      build,
      body,
      requestId,
    } satisfies Context;
    if (body.parallel) {
      await handleUpdateParallel(ctx);
    } else {
      await handleUpdateSingle(ctx);
    }

    res.send({
      build: await serializeBuild(build),
    });
  });
};

type Context = {
  body: RequestBody;
  project: Project;
  build: Build;
  requestId: string | null;
};

async function hasShardBeenProcessed(params: {
  buildId: string;
  requestId: string;
}) {
  const shard = await BuildShard.query().select("id").findOne({
    buildId: params.buildId,
    nonce: params.requestId,
  });
  return Boolean(shard);
}

/**
 * Parallel build update.
 */
async function handleUpdateParallel(ctx: Context) {
  const { body, build, requestId } = ctx;
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
        const shard = await BuildShard.query(trx)
          .insert({
            buildId: build.id,
            index: body.parallelIndex ?? null,
            nonce: requestId,
            metadata: body.metadata ?? null,
          })
          .onConflict(["buildId", "nonce"])
          .ignore();

        // If a shard already exists for this (buildId, nonce), the insert is a no-op:
        // this is a retried request that has already been processed.
        if (!shard.id) {
          return false;
        }

        const patchedBuild = await Build.query(trx)
          .patchAndFetchById(build.id, {
            batchCount: raw('"batchCount" + 1'),
            totalBatch: parallelTotal,
          })
          .select("batchCount");

        await insertFilesAndScreenshots({
          screenshots: body.screenshots,
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
