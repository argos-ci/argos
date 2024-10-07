import { invariant } from "@argos/util/invariant";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { createBuild as createBuildService } from "@/build/createBuild.js";
import config from "@/config/index.js";
import { Build } from "@/database/models/Build.js";
import { Project } from "@/database/models/Project.js";
import { getUnknownFileKeys } from "@/database/services/file.js";
import { getS3Client } from "@/storage/s3.js";
import { getSignedPutObjectUrl } from "@/storage/signed-url.js";
import { getRedisLock } from "@/util/redis/index.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { BuildSchema, serializeBuilds } from "../schema/primitives/build.js";
import {
  Sha1HashSchema,
  UniqueSha256HashArraySchema,
} from "../schema/primitives/sha.js";
import {
  conflict,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error.js";
import { z } from "../schema/util/zod.js";
import { CreateAPIHandler } from "../util.js";

const RequestBodySchema = z
  .object({
    commit: Sha1HashSchema,
    branch: z.string(),
    screenshotKeys: UniqueSha256HashArraySchema,
    pwTraceKeys: UniqueSha256HashArraySchema.optional(),
    name: z.string().nullable().optional(),
    parallel: z.boolean().nullable().optional(),
    parallelNonce: z.string().nullable().optional(),
    prNumber: z.number().int().min(1).nullable().optional(),
    prHeadCommit: z.string().nullable().optional(),
    referenceCommit: z.string().nullable().optional(),
    referenceBranch: z.string().nullable().optional(),
    mode: z.enum(["ci", "monitoring"]).nullable().optional(),
    ciProvider: z.string().nullable().optional(),
    argosSdk: z.string().nullable().optional(),
    runId: z.string().nullable().optional(),
    runAttempt: z.number().int().min(1).nullable().optional(),
  })
  .strict();

type RequestBody = z.infer<typeof RequestBodySchema>;

const UploadSchema = z
  .object({
    key: z.string(),
    putUrl: z.string().url(),
  })
  .strict();

type Upload = z.infer<typeof UploadSchema>;

const ResponseSchema = z
  .object({
    build: BuildSchema,
    screenshots: z.array(UploadSchema),
    pwTraces: z.array(UploadSchema),
  })
  .strict();

export const createBuildOperation = {
  operationId: "createBuild",
  requestBody: {
    content: {
      "application/json": {
        schema: RequestBodySchema,
      },
    },
  },
  responses: {
    "201": {
      description: "Result of build creation",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    "401": unauthorized,
    "409": conflict,
    "400": invalidParameters,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const createBuild: CreateAPIHandler = ({ post }) => {
  return post("/builds", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const ctx = {
      body: req.body,
      project: req.authProject,
    } satisfies BuildContext;

    const { build, screenshots, pwTraces } = await (async () => {
      if (ctx.body.parallel) {
        return handleCreateParallel(ctx);
      } else {
        return handleCreateSingle(ctx);
      }
    })();

    const [buildResponse] = await serializeBuilds([build]);
    invariant(buildResponse);

    res.status(201).send({
      build: buildResponse,
      screenshots,
      pwTraces,
    });
  });
};

type BuildContext = {
  body: RequestBody;
  project: Project;
};

/**
 * Get signed URLs for unknown file keys.
 */
async function getUploads(keys: string[]): Promise<Upload[]> {
  const unknownKeys = await getUnknownFileKeys(keys);
  const s3 = getS3Client();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  const putUrls = await Promise.all(
    unknownKeys.map((key) =>
      getSignedPutObjectUrl({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
        expiresIn: 1800, // 30 minutes
      }),
    ),
  );
  return unknownKeys.map((key, index) => {
    const putUrl = putUrls[index];
    invariant(putUrl, "`putUrl` is undefined");
    return { key, putUrl };
  });
}

/**
 * Get screenshots and pw traces from the request body.
 */
async function getScreenshotAndPwTraces(params: {
  screenshotKeys: string[];
  pwTraceKeys?: string[] | undefined;
}): Promise<{ screenshots: Upload[]; pwTraces: Upload[] }> {
  const screenshotKeys = params.screenshotKeys;
  const pwTraceKeys = params.pwTraceKeys ?? [];
  const fileKeys = [...params.screenshotKeys, ...pwTraceKeys];
  const uploads = await getUploads(fileKeys);
  return {
    screenshots: uploads.filter((upload) =>
      screenshotKeys.includes(upload.key),
    ),
    pwTraces: uploads.filter((upload) => pwTraceKeys.includes(upload.key)),
  };
}

/**
 * Get the build name.
 */
function getBuildName(name: string | null | undefined): string {
  return name || "default";
}

type CreateResult = {
  build: Build;
  screenshots: Upload[];
  pwTraces: Upload[];
};

/**
 * Handle creating a single build.
 */
async function handleCreateSingle(ctx: BuildContext): Promise<CreateResult> {
  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(ctx.body);
  const build = await createBuildFromRequest(ctx);
  return { build, screenshots, pwTraces };
}

/**
 * Handle creating a parallel build.
 */
async function handleCreateParallel(ctx: BuildContext): Promise<CreateResult> {
  const { body, project } = ctx;

  if (!body.parallelNonce) {
    throw boom(400, "`parallelNonce` is required when `parallel` is `true`");
  }

  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(body);
  const buildName = getBuildName(body.name);
  const { parallelNonce } = body;

  const lock = await getRedisLock();
  const build = await lock.acquire(
    [
      "create-build-parallel",
      project.id,
      body.commit,
      buildName,
      parallelNonce,
    ],
    async () => {
      const existingBuild = await Build.query()
        .withGraphFetched("compareScreenshotBucket")
        .findOne({
          "builds.projectId": project.id,
          externalId: parallelNonce,
          name: buildName,
        });

      if (existingBuild) {
        invariant(existingBuild.compareScreenshotBucket, "Bucket should exist");
        if (existingBuild.compareScreenshotBucket.complete) {
          throw boom(409, `Build already finalized`);
        }

        return existingBuild;
      }

      return createBuildFromRequest(ctx);
    },
  );

  return { build, screenshots, pwTraces };
}

/**
 * Create a build from the request body.
 */
async function createBuildFromRequest(ctx: BuildContext) {
  const { body, project } = ctx;
  return createBuildService({
    project,
    buildName: body.name ?? null,
    commit: body.commit,
    branch: body.branch,
    mode: body.mode ?? null,
    parallel:
      body.parallel && body.parallelNonce
        ? { nonce: body.parallelNonce }
        : null,
    prNumber: body.prNumber ?? null,
    prHeadCommit: body.prHeadCommit ?? null,
    referenceCommit: body.referenceCommit ?? null,
    baseBranch: body.referenceBranch ?? null,
    runId: body.runId ?? null,
    runAttempt: body.runAttempt ?? null,
    ciProvider: body.ciProvider ?? null,
    argosSdk: body.argosSdk ?? null,
  });
}
