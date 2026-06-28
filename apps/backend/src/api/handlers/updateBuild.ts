import {
  BuildMetadata,
  BuildMetadataSchema,
} from "@argos/schemas/build-metadata";
import { TransactionOrKnex } from "objection";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { job as buildJob } from "@/build";
import { finalizeBuild } from "@/build/finalizeBuild";
import { raw, transaction } from "@/database";
import {
  Build,
  BuildShard,
  Project,
  Screenshot,
  ScreenshotBucket,
} from "@/database/models";
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
import { projectTokenAuth } from "../schema/util/security";
import { CreateAPIHandler } from "../util";

const RequestBodySchema = z.object({
  screenshots: z.array(ScreenshotInputSchema),
  parallel: z.boolean().nullish(),
  parallelTotal: z.number().int().min(-1).nullish(),
  parallelIndex: z.number().int().min(1).nullish(),
  final: z
    .boolean()
    .nullish()
    .meta({
      description:
        "Only used for non-parallel builds. Indicates that this is the last " +
        "request of the build, so Argos can finalize it. A build whose " +
        "screenshots are too large to fit in a single request can split them " +
        "across several sequential requests, leaving `final` falsy on every " +
        "request but the last. Defaults to `true`.",
    }),
  metadata: BuildMetadataSchema.optional().meta({
    description: "Build metadata",
    id: "BuildMetadata",
  }),
});

type RequestBody = z.infer<typeof RequestBodySchema>;

export const updateBuildOperation = {
  operationId: "updateBuild",
  summary: "Update a build",
  description:
    "Add screenshots to an existing build and update its metadata. Used to push the screenshots of a parallel shard, identified by `parallelIndex` and `parallelTotal`.",
  tags: ["Builds"],
  security: projectTokenAuth,
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
      // The request that finalized the build may be retried (e.g. its response
      // was lost). If it has already been processed — every screenshot it
      // carries is already stored — we return the build instead of failing so
      // retries are idempotent. This holds for both single and parallel builds
      // and does not rely on a request id (not every SDK sends one).
      const duplicateRequest = await areAllScreenshotsInserted({
        build,
        screenshots: body.screenshots,
      });
      if (duplicateRequest) {
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

/**
 * Whether every screenshot of the request is already stored in the build with
 * the same file, meaning the request has already been processed. Used to make
 * build updates idempotent against retries.
 */
async function areAllScreenshotsInserted(params: {
  build: Build;
  screenshots: RequestBody["screenshots"];
}) {
  const { build, screenshots } = params;
  if (screenshots.length === 0) {
    return true;
  }
  const existing = await Screenshot.query()
    .select("name", "s3Id")
    .where("screenshotBucketId", build.compareScreenshotBucketId)
    .whereIn(
      "name",
      screenshots.map((screenshot) => screenshot.name),
    );
  const keyByName = new Map(existing.map((row) => [row.name, row.s3Id]));
  return screenshots.every(
    (screenshot) => keyByName.get(screenshot.name) === screenshot.key,
  );
}

/**
 * Parallel build update.
 */
async function handleUpdateParallel(ctx: Context) {
  const { body, build, requestId } = ctx;
  const final = body.final ?? true;
  const parallelIndex = body.parallelIndex ?? null;
  const parallelTotal =
    typeof body.parallelTotal === "number" ? body.parallelTotal : null;
  const expectedTotal =
    parallelTotal !== null && parallelTotal > 0 ? parallelTotal : null;

  if (expectedTotal && build.totalBatch && build.totalBatch !== expectedTotal) {
    throw boom(400, "`parallelTotal` must be the same on every batch");
  }

  // A shard uploaded across several requests is identified by its
  // `parallelIndex`, so it is required as soon as the upload is split.
  if (!final && parallelIndex === null) {
    throw boom(400, "`parallelIndex` is required when `final` is `false`");
  }

  const complete = await redisLock.acquire(
    ["update-build-parallel", build.id],
    () =>
      transaction(async (trx) => {
        const shard = await resolveParallelShard({
          trx,
          build,
          requestId,
          parallelIndex,
        });

        // The request has already been fully processed: a retry of a completed
        // shard or of an index-less request.
        if (!shard) {
          return false;
        }

        await insertFilesAndScreenshots({
          screenshots: body.screenshots,
          build,
          shard,
          trx,
        });

        // The shard isn't complete yet: more requests of the same shard will
        // follow before it counts towards the build's batches.
        if (!final) {
          return false;
        }

        return completeParallelShard({
          trx,
          build,
          shard,
          requestId,
          metadata: body.metadata ?? null,
          parallelTotal,
          expectedTotal,
        });
      }),
  );

  if (complete) {
    await buildJob.push(build.id);
  }
}

/**
 * Resolve the shard a parallel request belongs to, creating it if needed.
 *
 * Like a single build, a parallel shard can be uploaded across several
 * requests. Requests of the same shard share their `parallelIndex` and the
 * shard's `nonce` stays null until its last request (`final`). Index-less
 * shards (manual finalization) can't be split and are identified by the request
 * nonce, as before.
 *
 * Returns `null` when the request has already been fully processed (a retry).
 */
async function resolveParallelShard(params: {
  trx: TransactionOrKnex;
  build: Build;
  requestId: string | null;
  parallelIndex: number | null;
}): Promise<BuildShard | null> {
  const { trx, build, requestId, parallelIndex } = params;

  if (parallelIndex === null) {
    const shard = await BuildShard.query(trx)
      .insert({ buildId: build.id, index: null, nonce: requestId })
      .onConflict(["buildId", "nonce"])
      .ignore();
    // If a shard already exists for this (buildId, nonce), the insert is a
    // no-op: this is a retried request that has already been processed.
    return shard.id ? shard : null;
  }

  const existingShard = await BuildShard.query(trx).findOne({
    buildId: build.id,
    index: parallelIndex,
  });

  if (existingShard) {
    // A completed shard (nonce set) hit again is a retried finalizing request:
    // screenshots are idempotent, so there is nothing left to do.
    return existingShard.nonce ? null : existingShard;
  }

  return BuildShard.query(trx).insert({
    buildId: build.id,
    index: parallelIndex,
    nonce: null,
  });
}

/**
 * Complete a parallel shard: mark it done and count it towards the build's
 * batches, finalizing the build once every batch has been received.
 */
async function completeParallelShard(params: {
  trx: TransactionOrKnex;
  build: Build;
  shard: BuildShard;
  requestId: string | null;
  metadata: BuildMetadata | null;
  parallelTotal: number | null;
  expectedTotal: number | null;
}): Promise<boolean> {
  const {
    trx,
    build,
    shard,
    requestId,
    metadata,
    parallelTotal,
    expectedTotal,
  } = params;

  // `nonce` marks the shard as complete, so it must be non-null even when the
  // request carries no id; the shard's own id is a safe fallback marker.
  await BuildShard.query(trx)
    .findById(shard.id)
    .patch({ nonce: requestId ?? shard.id, metadata });

  const patchedBuild = await Build.query(trx)
    .patchAndFetchById(build.id, {
      batchCount: raw('"batchCount" + 1'),
      totalBatch: parallelTotal,
    })
    .select("batchCount");

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
}

/**
 * Single build update.
 *
 * A single build can be uploaded in one request or, when its screenshots are
 * too large to fit in a single request, split across several sequential
 * requests sharing the same build. Every request inserts its own screenshots;
 * only the last one (`final`) finalizes the build. Unlike parallel builds, the
 * screenshots all belong to the same bucket (no shard).
 */
async function handleUpdateSingle(ctx: Context) {
  const { body, build } = ctx;
  const final = body.final ?? true;
  const metadata = body.metadata ?? null;
  // Serialize the requests of a single build. The api-client aborts and retries
  // a request after a timeout while the server may still be processing the
  // original one, so two requests can run concurrently. Without a unique
  // constraint to rely on, concurrent runs would otherwise double-insert
  // screenshots or finalize the build twice.
  const finalized = await redisLock.acquire(
    ["update-build-single", build.id],
    () =>
      transaction(async (trx) => {
        await insertFilesAndScreenshots({
          screenshots: body.screenshots,
          build,
          trx,
        });
        if (!final) {
          return false;
        }
        // A retry that overlapped the original finalizing request must not
        // finalize the build twice.
        const bucket = await ScreenshotBucket.query(trx)
          .findById(build.compareScreenshotBucketId)
          .select("complete");
        if (bucket?.complete) {
          return false;
        }
        // The screenshot counts are computed from the database so they account
        // for the screenshots inserted by every request of the build.
        await finalizeBuild({ trx, build, metadata });
        return true;
      }),
  );
  if (finalized) {
    await buildJob.push(build.id);
  }
}
