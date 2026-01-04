import { invariant } from "@argos/util/invariant";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import { job as buildJob } from "@/build";
import { createBuild as createBuildService } from "@/build/createBuild";
import { finalizeBuild } from "@/build/finalizeBuild";
import config from "@/config";
import { Build } from "@/database/models/Build";
import { Project } from "@/database/models/Project";
import { getUnknownFileKeys } from "@/database/services/file";
import { getS3Client } from "@/storage/s3";
import { getSignedObjectUrl } from "@/storage/signed-url";
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";
import { repoAuth } from "@/web/middlewares/repoAuth";

import { BuildSchema, serializeBuild } from "../schema/primitives/build";
import {
  Sha1HashSchema,
  UniqueSha256HashArraySchema,
} from "../schema/primitives/sha";
import {
  conflict,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

const RequestBodySchema = z.object({
  commit: Sha1HashSchema.meta({
    description: "The commit the build is running on",
  }),
  branch: z
    .string()
    .meta({ description: "The branch the build is running on" }),
  screenshotKeys: UniqueSha256HashArraySchema.meta({
    description: "Keys of screenshot files",
  }),
  pwTraceKeys: UniqueSha256HashArraySchema.optional().meta({
    description: "Keys of Playwright trace files",
  }),
  name: z.string().nullable().optional().meta({
    description: "The name of the build (for multi-build setups)",
  }),
  parallel: z.boolean().nullable().optional().meta({
    description: "Whether to run the build in parallel",
  }),
  parallelNonce: z.string().nullable().optional().meta({
    description: "A unique nonce for the parallel build",
  }),
  prNumber: z.number().int().min(1).nullable().optional().meta({
    description: "The pull request number",
  }),
  prHeadCommit: Sha1HashSchema.nullable().optional().meta({
    description: "The head commit of the pull request",
  }),
  // To avoid breaking change, we keep referenceCommit instead of baseCommit
  referenceCommit: Sha1HashSchema.nullable().optional().meta({
    description: "The commit to use as a reference for the build",
  }),
  // To avoid breaking change, we keep referenceBranch instead of baseBranch
  referenceBranch: z.string().nullable().optional().meta({
    description: "The branch to use as a reference for the build",
  }),
  parentCommits: z.array(Sha1HashSchema).nullable().optional().meta({
    description: "The parent commits of the build",
  }),
  mode: z.enum(["ci", "monitoring"]).nullable().optional().meta({
    description: "The mode in which the build is running",
  }),
  ciProvider: z.string().nullable().optional().meta({
    description: "The CI provider being used",
  }),
  argosSdk: z.string().nullable().optional().meta({
    description: "The version of the Argos SDK being used",
  }),
  runId: z.string().nullable().optional().meta({
    description: "The ID of the current run",
  }),
  runAttempt: z.number().int().min(1).nullable().optional().meta({
    description: "The attempt number of the current run",
  }),
  skipped: z.boolean().nullable().optional().meta({
    description:
      "Whether the build was skipped, not comparing anything and always succeeding",
  }),
  mergeQueue: z.boolean().nullable().optional().meta({
    description: "Whether the build has been created in a merge queue",
  }),
});

type RequestBody = z.infer<typeof RequestBodySchema>;

const UploadSchema = z.object({
  key: z.string(),
  putUrl: z.url(),
});

type Upload = z.infer<typeof UploadSchema>;

const ResponseSchema = z.object({
  build: BuildSchema,
  screenshots: z.array(UploadSchema),
  pwTraces: z.array(UploadSchema),
});

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

    res.status(201).send({
      build: await serializeBuild(build),
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
      getSignedObjectUrl({
        s3,
        Key: key,
        Bucket: screenshotsBucket,
        expiresIn: 1800, // 30 minutes
        method: "PUT",
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
 * Create and finalize a skipped build.
 */
async function createSkippedBuild(ctx: BuildContext): Promise<Build> {
  const build = await createBuildFromRequest(ctx);
  await finalizeBuild({
    build,
    single: { metadata: null, screenshots: { all: 0, storybook: 0 } },
  });
  await buildJob.push(build.id);
  return build;
}

/**
 * Handle creating a single build.
 */
async function handleCreateSingle(ctx: BuildContext): Promise<CreateResult> {
  const { screenshots, pwTraces } = await getScreenshotAndPwTraces(ctx.body);
  const build = ctx.body.skipped
    ? await createSkippedBuild(ctx)
    : await createBuildFromRequest(ctx);
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

  const build = await redisLock.acquire(
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

      if (ctx.body.skipped) {
        if (existingBuild) {
          return existingBuild;
        }
        return createSkippedBuild(ctx);
      }

      if (existingBuild) {
        invariant(existingBuild.compareScreenshotBucket, "Bucket should exist");
        if (existingBuild.compareScreenshotBucket.complete) {
          throw boom(409, `Build already finalized`);
        }

        return existingBuild;
      }

      return createBuildFromRequest(ctx);
    },
    { timeout: 40_000 }, // 40 seconds
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
    baseCommit: body.referenceCommit ?? null,
    parentCommits: body.parentCommits ?? null,
    baseBranch: body.referenceBranch ?? null,
    runId: body.runId ?? null,
    runAttempt: body.runAttempt ?? null,
    ciProvider: body.ciProvider ?? null,
    argosSdk: body.argosSdk ?? null,
    skipped: body.skipped ?? false,
    mergeQueue: body.mergeQueue ?? false,
  });
}
