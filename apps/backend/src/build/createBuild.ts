import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { pushBuildNotification } from "@/build-notification";
import { checkIsPartialBuild } from "@/build/partial";
import { transaction } from "@/database";
import {
  Build,
  BuildMode,
  GithubPullRequest,
  Project,
  ScreenshotBucket,
} from "@/database/models";
import { checkIsBlockedBySpendLimit } from "@/database/services/spend-limit";
import { job as githubPullRequestJob } from "@/github-pull-request/job";
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";

async function getOrCreatePullRequest({
  githubRepositoryId,
  number,
}: {
  githubRepositoryId: string;
  number: number;
}) {
  return redisLock.acquire(
    ["pull-request-creation", githubRepositoryId, number],
    async () => {
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
    },
  );
}

export async function createBuild(params: {
  project: Project;
  commit: string;
  branch: string;
  buildName: string | null;
  parallel: { nonce: string } | null;
  prNumber: number | null;
  prHeadCommit: string | null;
  baseCommit: string | null;
  parentCommits: string[] | null;
  baseBranch: string | null;
  mode: BuildMode | null;
  ciProvider: string | null;
  argosSdk: string | null;
  runId: string | null;
  runAttempt: number | null;
  skipped: boolean | null;
}) {
  const account = await params.project.$relatedQuery("account");
  invariant(account, "Account should be fetched");

  const manager = account.$getSubscriptionManager();
  const [plan, outOfCapacityReason, isBlockedBySpendLimit] = await Promise.all([
    manager.getPlan(),
    manager.checkIsOutOfCapacity(),
    checkIsBlockedBySpendLimit(account),
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

  if (isBlockedBySpendLimit) {
    const spendLimit = account.meteredSpendLimitByPeriod;
    invariant(
      spendLimit !== null,
      "If we are over the spend limit, it should be set",
    );
    const subscription = await manager.getActiveSubscription();
    invariant(
      subscription,
      "A subscription should be active if we are over the spend limit",
    );
    const currency = subscription.currency;
    invariant(
      currency,
      "A currency should be set if we are over the spend limit",
    );
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    });
    throw boom(
      402,
      `You have reached the spend limit of ${formatter.format(spendLimit)} for this billing period. Ask a owner to update the limit in your Team settings.`,
    );
  }

  const buildName = params.buildName || "default";
  const mode = params.mode ?? "ci";

  const [pullRequest, isPartial] = await Promise.all([
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
  ]);

  const build = await redisLock.acquire(
    ["create-build", params.project.id],
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
          prNumber: params.prNumber,
          prHeadCommit: params.prHeadCommit,
          githubPullRequestId: pullRequest?.id ? String(pullRequest?.id) : null,
          baseCommit: params.baseCommit,
          parentCommits: params.parentCommits,
          baseBranch: params.baseBranch,
          baseBranchResolvedFrom: params.baseBranch ? "user" : null,
          compareScreenshotBucketId: bucket.id,
          mode,
          ciProvider: params.ciProvider,
          argosSdk: params.argosSdk,
          runId: params.runId,
          runAttempt: params.runAttempt,
          partial: isPartial,
          type: params.skipped ? "skipped" : null,
        });

        return build;
      });
    },
    { timeout: 40_000 }, // 40 seconds
  );

  await pushBuildNotification({ buildId: build.id, type: "queued" });

  return build;
}
