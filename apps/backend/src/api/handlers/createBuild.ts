import { SnapshotContentTypeSchema } from "@argos/schemas/content-type";
import { invariant } from "@argos/util/invariant";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
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
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";

import { getAuthProjectPayloadFromExpressReq } from "../auth/project";
import { BuildSchema, serializeBuild } from "../schema/primitives/build";
import { GitBranchSchema, GitPRNumberSchema } from "../schema/primitives/git";
import {
  Sha1HashSchema,
  Sha256HashSchema,
  UniqueSha256HashArraySchema,
} from "../schema/primitives/sha";
import {
  conflict,
  invalidParameters,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { CreateAPIHandler } from "../util";

/**
 * Maximum size (in bytes) accepted for an uploaded snapshot or trace file. The
 * limit is enforced by S3 itself: each presigned upload URL is signed with a
 * `content-length-range` condition that S3 verifies on receipt, so an oversized
 * file is rejected at upload time and never reaches the bucket.
 */
const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Content type of Playwright trace files. Hard-coded because the SDK always
 * uploads traces as ZIP archives.
 */
const PLAYWRIGHT_TRACE_CONTENT_TYPE = "application/zip";

const ScreenshotUploadRequestSchema = z
  .object({
    key: Sha256HashSchema,
    contentType: SnapshotContentTypeSchema,
  })
  .meta({
    description: "Screenshot file to upload",
    id: "ScreenshotUploadRequest",
  });

type ScreenshotUploadRequest = z.infer<typeof ScreenshotUploadRequestSchema>;

const UniqueScreenshotUploadsSchema = z
  .array(ScreenshotUploadRequestSchema)
  .refine(
    (items) => new Set(items.map((item) => item.key)).size === items.length,
    { message: "Must be an array of uploads with unique keys" },
  );

const RequestBodySchema = z.object({
  commit: Sha1HashSchema.meta({
    description: "The commit the build is running on",
  }),
  branch: GitBranchSchema.meta({
    description: "The branch the build is running on",
  }),
  screenshots: UniqueScreenshotUploadsSchema.meta({
    description: "Screenshot files to upload",
  }),
  pwTraceKeys: UniqueSha256HashArraySchema.optional().meta({
    description: "Keys of Playwright trace files",
  }),
  name: z.string().nullish().meta({
    description: "The name of the build (for multi-build setups)",
  }),
  parallel: z.boolean().nullish().meta({
    description: "Whether to run the build in parallel",
  }),
  parallelNonce: z.string().nullish().meta({
    description: "A unique nonce for the parallel build",
  }),
  prNumber: GitPRNumberSchema.nullish().meta({
    description: "The pull request number",
  }),
  prHeadCommit: Sha1HashSchema.nullish().meta({
    description: "The head commit of the pull request",
  }),
  // To avoid breaking change, we keep referenceCommit instead of baseCommit
  referenceCommit: Sha1HashSchema.nullish().meta({
    description: "The commit to use as a reference for the build",
  }),
  // To avoid breaking change, we keep referenceBranch instead of baseBranch
  referenceBranch: z.string().nullish().meta({
    description: "The branch to use as a reference for the build",
  }),
  parentCommits: z.array(Sha1HashSchema).nullish().meta({
    description: "The parent commits of the build",
  }),
  mode: z.enum(["ci", "monitoring"]).nullish().meta({
    description: "The mode in which the build is running",
  }),
  ciProvider: z.string().nullish().meta({
    description: "The CI provider being used",
  }),
  argosSdk: z.string().nullish().meta({
    description: "The version of the Argos SDK being used",
  }),
  runId: z.string().nullish().meta({
    description: "The ID of the current run",
  }),
  runAttempt: z.number().int().min(1).nullish().meta({
    description: "The attempt number of the current run",
  }),
  skipped: z.boolean().nullish().meta({
    description:
      "Whether the build was skipped, not comparing anything and always succeeding",
  }),
  mergeQueue: z.boolean().nullish().meta({
    description: "Whether the build has been created in a merge queue",
  }),
  mergeQueuePrNumbers: z.array(z.number().int().min(1)).min(1).nullish().meta({
    description:
      "Pull request numbers aggregated by the merge queue build. Requires `mergeQueue` to be `true`.",
  }),
  subset: z
    .boolean()
    .nullish()
    .meta({
      description:
        "Indicates whether this build contains only a subset of screenshots.\n" +
        "This is useful when a build is created from an incomplete test suite where some tests are skipped.",
    }),
});

type RequestBody = z.infer<typeof RequestBodySchema>;

const UploadSchema = z.object({
  key: z.string(),
  url: z.url(),
  fields: z.record(z.string(), z.string()),
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
  return post("/builds", async (req, res) => {
    const auth = await getAuthProjectPayloadFromExpressReq(req);

    const ctx = {
      body: req.body,
      project: auth.project,
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
 * Get presigned POST policies for the given items.
 *
 * Each policy is signed with two conditions enforced by S3 on upload:
 *   - `content-length-range`: the body size must be within
 *     `[1, MAX_UPLOAD_FILE_BYTES]`.
 *   - `eq $Content-Type <contentType>`: the client must upload with exactly the
 *     content type declared at `createBuild` time.
 */
async function getUploads(
  items: { key: string; contentType: string }[],
): Promise<Upload[]> {
  const unknownKeys = new Set(
    await getUnknownFileKeys(items.map((item) => item.key)),
  );
  const unknownItems = items.filter((item) => unknownKeys.has(item.key));
  const s3 = getS3Client();
  const screenshotsBucket = config.get("s3.screenshotsBucket");
  return Promise.all(
    unknownItems.map(async (item) => {
      const { url, fields } = await createPresignedPost(s3, {
        Bucket: screenshotsBucket,
        Key: item.key,
        Expires: 1800, // 30 minutes
        Conditions: [
          ["content-length-range", 1, MAX_UPLOAD_FILE_BYTES],
          ["eq", "$Content-Type", item.contentType],
        ],
      });
      return { key: item.key, url, fields };
    }),
  );
}

/**
 * Get screenshots and pw traces from the request body.
 */
async function getScreenshotAndPwTraces(params: {
  screenshots: ScreenshotUploadRequest[];
  pwTraceKeys?: string[] | undefined;
}): Promise<{ screenshots: Upload[]; pwTraces: Upload[] }> {
  const screenshotKeys = new Set(params.screenshots.map((s) => s.key));
  const pwTraceItems = (params.pwTraceKeys ?? []).map((key) => ({
    key,
    contentType: PLAYWRIGHT_TRACE_CONTENT_TYPE,
  }));
  const uploads = await getUploads([...params.screenshots, ...pwTraceItems]);
  return {
    screenshots: uploads.filter((upload) => screenshotKeys.has(upload.key)),
    pwTraces: uploads.filter((upload) => !screenshotKeys.has(upload.key)),
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
    mergeQueuePrNumbers: body.mergeQueuePrNumbers ?? null,
    subset: body.subset ?? false,
  });
}
