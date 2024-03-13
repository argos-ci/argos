import { assertNever } from "@argos/util/assertNever";
import type { Request } from "express";

import { pushBuildNotification } from "@/build-notification/index.js";
import { transaction } from "@/database/index.js";
import {
  Build,
  GithubPullRequest,
  Project,
  ScreenshotBucket,
} from "@/database/models/index.js";
import { job as githubPullRequestJob } from "@/github-pull-request/job.js";
import { getRedisLock } from "@/util/redis/index.js";
import { boom } from "@/web/util.js";

export const getBuildName = (name: string | undefined | null) =>
  name || "default";

const getOrCreatePullRequest = async ({
  githubRepositoryId,
  number,
}: {
  githubRepositoryId: string;
  number: number;
}) => {
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
};

type CreateRequest = Request<
  Record<string, never>,
  Record<string, never>,
  {
    commit: string;
    branch: string;
    referenceCommit?: string | null;
    referenceBranch?: string | null;
    name?: string | null;
    parallel?: string | null;
    parallelNonce?: string | null;
    prNumber?: number | null;
    prHeadCommit?: string | null;
  }
> & { authProject: Project };

const createBuild = async (params: {
  project: Project;
  commit: string;
  branch: string;
  buildName?: string | null;
  parallel?: { nonce: string } | null;
  prNumber?: number | null;
  prHeadCommit?: string | null;
  referenceCommit?: string | null;
  referenceBranch?: string | null;
}) => {
  const account = await params.project.$relatedQuery("account");
  if (!account) {
    throw boom(404, `Account not found.`);
  }

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

  const githubRepository =
    await params.project.$relatedQuery("githubRepository");

  const pullRequest =
    params.prNumber && githubRepository
      ? await getOrCreatePullRequest({
          githubRepositoryId: githubRepository.id,
          number: params.prNumber,
        })
      : null;

  const lock = await getRedisLock();
  const build = await lock.acquire(
    `buildCreation-${params.project.id}`,
    async () => {
      return transaction(async (trx) => {
        const bucket = await ScreenshotBucket.query(trx).insertAndFetch({
          name: buildName,
          commit: params.commit,
          branch: params.branch,
          projectId: params.project.id,
          complete: false,
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
};

export const createBuildFromRequest = async ({
  req,
}: {
  req: CreateRequest;
}) => {
  return createBuild({
    project: req.authProject,
    buildName: req.body.name ?? null,
    commit: req.body.commit,
    branch: req.body.branch,
    parallel:
      req.body.parallel && req.body.parallelNonce
        ? { nonce: req.body.parallelNonce }
        : null,
    prNumber: req.body.prNumber ?? null,
    prHeadCommit: req.body.prHeadCommit ?? null,
    referenceCommit: req.body.referenceCommit ?? null,
    referenceBranch: req.body.referenceBranch ?? null,
  });
};
