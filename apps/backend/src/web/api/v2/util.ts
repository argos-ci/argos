import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { Request } from "express";

import { pushBuildNotification } from "@/build-notification/index.js";
import { checkIsPartialBuild } from "@/build/partial.js";
import { transaction } from "@/database/index.js";
import {
  Build,
  BuildMode,
  GithubPullRequest,
  Project,
  ScreenshotBucket,
  ScreenshotMetadata,
  ScreenshotMetadataJsonSchema,
} from "@/database/models/index.js";
import {
  BuildMetadata,
  BuildMetadataJsonSchema,
} from "@/database/services/buildMetadata.js";
import { job as githubPullRequestJob } from "@/github-pull-request/job.js";
import { getRedisLock } from "@/util/redis/index.js";
import { SHA1_REGEX_STR, SHA256_REGEX_STR } from "@/web/constants";
import { validate } from "@/web/middlewares/validate";
import { boom } from "@/web/util.js";

export const getBuildName = (name: string | undefined | null) =>
  name || "default";

async function getOrCreatePullRequest({
  githubRepositoryId,
  number,
}: {
  githubRepositoryId: string;
  number: number;
}) {
  const lockKey = `pullRequestCreation-${githubRepositoryId}:${number}`;
  const lock = await getRedisLock();
  return lock.acquire(lockKey, async () => {
    const existingPr = await GithubPullRequest.query().findOne({
      githubRepositoryId,
      number,
    });

    if (existingPr) {
      return existingPr;
    }

    const pr = await GithubPullRequest.query().insertAndFetch({
      githubRepositoryId,
      number,
      jobStatus: "pending",
    });

    await githubPullRequestJob.push(pr.id);

    return pr;
  });
}

export const validateCreateRequest = validate({
  body: {
    type: "object",
    required: ["commit", "branch", "screenshotKeys"],
    properties: {
      commit: {
        type: "string",
        pattern: SHA1_REGEX_STR,
      },
      screenshotKeys: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", pattern: SHA256_REGEX_STR },
      },
      pwTraceKeys: {
        type: "array",
        uniqueItems: true,
        items: { type: "string", pattern: SHA256_REGEX_STR },
      },
      branch: {
        type: "string",
      },
      name: {
        type: "string",
        nullable: true,
      },
      parallel: {
        type: "boolean",
        nullable: true,
      },
      parallelNonce: {
        type: "string",
        nullable: true,
      },
      prNumber: {
        type: "integer",
        minimum: 1,
        nullable: true,
      },
      prHeadCommit: {
        type: "string",
        nullable: true,
      },
      referenceCommit: {
        type: "string",
        nullable: true,
      },
      referenceBranch: {
        type: "string",
        nullable: true,
      },
      mode: {
        oneOf: [
          { type: "string", enum: ["ci", "monitoring"] },
          { type: "null" },
        ],
      },
      ciProvider: {
        type: "string",
        nullable: true,
      },
      argosSdk: {
        type: "string",
        nullable: true,
      },
      runId: {
        type: "string",
        nullable: true,
      },
      runAttempt: {
        type: "integer",
        minimum: 1,
        nullable: true,
      },
    },
  },
});

type CreateRequestPayload = {
  commit: string;
  screenshotKeys: string[];
  pwTraceKeys?: string[];
  branch: string;
  name?: string | null;
  parallel?: string | null;
  parallelNonce?: string | null;
  prNumber: number | null;
  prHeadCommit?: string | null;
  referenceCommit?: string | null;
  referenceBranch?: string | null;
  mode?: "ci" | "monitoring";
  ciProvider?: string | null;
  argosSdk?: string | null;
  runId?: string | null;
  runAttempt?: number | null;
};

export type CreateRequest = Request<
  Record<string, never>,
  Record<string, never>,
  CreateRequestPayload
> & { authProject: Project };

export const validateUpdateRequest = validate({
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
            baseName: {
              type: "string",
              nullable: true,
            },
            metadata: ScreenshotMetadataJsonSchema,
            pwTraceKey: {
              type: "string",
              pattern: SHA256_REGEX_STR,
              nullable: true,
            },
            threshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
              nullable: true,
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
      parallelIndex: {
        type: "integer",
        minimum: 1,
        nullable: true,
      },
      metadata: BuildMetadataJsonSchema,
    },
  },
});

export type UpdateRequest = Request<
  {
    buildId?: string;
  },
  Record<string, never>,
  {
    commit: string;
    screenshots: {
      key: string;
      name: string;
      baseName?: string | null;
      metadata?: ScreenshotMetadata | null;
      pwTraceKey?: string | null;
      threshold?: number | null;
    }[];
    parallel?: boolean | null;
    parallelTotal?: number | null;
    parallelIndex?: number | null;
    metadata?: BuildMetadata | null;
  }
> & { authProject?: Project };

async function createBuild(params: {
  project: Project;
  commit: string;
  branch: string;
  buildName: string | null;
  parallel: { nonce: string } | null;
  prNumber: number | null;
  prHeadCommit: string | null;
  referenceCommit: string | null;
  referenceBranch: string | null;
  mode: BuildMode | null;
  ciProvider: string | null;
  argosSdk: string | null;
  runId: string | null;
  runAttempt: number | null;
}) {
  const account = await params.project.$relatedQuery("account");
  invariant(account, "Account should be fetched");

  const manager = account.$getSubscriptionManager();
  const [plan, outOfCapacityReason] = await Promise.all([
    manager.getPlan(),
    manager.checkIsOutOfCapacity(),
  ]);

  if (account.type === "team" && !plan) {
    throw boom(
      402,
      `Build rejected: subscribe to a Pro plan to use Team features.`,
    );
  }

  switch (outOfCapacityReason) {
    case null: {
      break;
    }
    case "trialing":
      throw boom(
        402,
        `You have reached the maximum screenshot capacity of your ${plan ? `${plan.displayName} Plan` : "Plan"} trial. Please upgrade your Plan.`,
      );
    case "flat-rate":
      throw boom(
        402,
        `You have reached the maximum screenshot capacity included in your ${plan ? `${plan.displayName} Plan` : "Plan"}. Please upgrade your Plan.`,
      );
    default:
      assertNever(outOfCapacityReason);
  }

  const buildName = params.buildName || "default";
  const mode = params.mode ?? "ci";

  const [pullRequest, isPartial, lock] = await Promise.all([
    (async () => {
      if (!params.prNumber) {
        return null;
      }
      const githubRepository =
        await params.project.$relatedQuery("githubRepository");
      if (!githubRepository) {
        return null;
      }
      return getOrCreatePullRequest({
        githubRepositoryId: githubRepository.id,
        number: params.prNumber,
      });
    })(),
    checkIsPartialBuild({
      ciProvider: params.ciProvider ?? null,
      project: params.project,
      runAttempt: params.runAttempt ?? null,
      runId: params.runId ?? null,
    }),
    getRedisLock(),
  ]);

  const build = await lock.acquire(
    `buildCreation-${params.project.id}-${buildName}`,
    async () => {
      return transaction(async (trx) => {
        const bucket = await ScreenshotBucket.query(trx).insertAndFetch({
          name: buildName,
          commit: params.commit,
          branch: params.branch,
          projectId: params.project.id,
          complete: false,
          valid: false,
          mode,
        });

        const build = await Build.query(trx).insertAndFetch({
          jobStatus: "pending" as const,
          baseScreenshotBucketId: null,
          externalId: params.parallel ? params.parallel.nonce : null,
          batchCount: params.parallel ? 0 : null,
          projectId: params.project.id,
          name: buildName,
          prNumber: params.prNumber ?? null,
          prHeadCommit: params.prHeadCommit ?? null,
          githubPullRequestId: pullRequest?.id ? String(pullRequest?.id) : null,
          referenceCommit: params.referenceCommit ?? null,
          referenceBranch: params.referenceBranch ?? null,
          compareScreenshotBucketId: bucket.id,
          mode,
          ciProvider: params.ciProvider ?? null,
          argosSdk: params.argosSdk ?? null,
          runId: params.runId ?? null,
          runAttempt: params.runAttempt ?? null,
          partial: isPartial,
        });

        return build;
      });
    },
  );

  await pushBuildNotification({
    buildId: build.id,
    type: "queued",
  });

  return build;
}

export async function createBuildFromRequest({ req }: { req: CreateRequest }) {
  return createBuild({
    project: req.authProject,
    buildName: req.body.name ?? null,
    commit: req.body.commit,
    branch: req.body.branch,
    mode: req.body.mode ?? null,
    parallel:
      req.body.parallel && req.body.parallelNonce
        ? { nonce: req.body.parallelNonce }
        : null,
    prNumber: req.body.prNumber ?? null,
    prHeadCommit: req.body.prHeadCommit ?? null,
    referenceCommit: req.body.referenceCommit ?? null,
    referenceBranch: req.body.referenceBranch ?? null,
    runId: req.body.runId ?? null,
    runAttempt: req.body.runAttempt ?? null,
    ciProvider: req.body.ciProvider ?? null,
    argosSdk: req.body.argosSdk ?? null,
  });
}
