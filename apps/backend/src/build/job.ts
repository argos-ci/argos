import { invariant } from "@argos/util/invariant";

import { pushBuildNotification } from "@/build-notification/index.js";
import {
  Account,
  Build,
  Project,
  ScreenshotDiff,
} from "@/database/models/index.js";
import { job as githubPullRequestJob } from "@/github-pull-request/job.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";
import { updateStripeUsage } from "@/stripe/index.js";
import { getRedisLock } from "@/util/redis/index.js";

import { concludeBuild } from "./concludeBuild.js";
import { createBuildDiffs } from "./createBuildDiffs.js";

/**
 * Pushes the diffs to the screenshot-diff job queue.
 * If there is no diff to proceed, it pushes a notification.
 */
async function pushDiffs(input: {
  build: Build;
  screenshotDiffs: ScreenshotDiff[];
}) {
  const toProcessedDiffIds = input.screenshotDiffs
    .filter(({ jobStatus }) => jobStatus !== "complete")
    .map(({ id }) => id);

  if (toProcessedDiffIds.length > 0) {
    await screenshotDiffJob.push(...toProcessedDiffIds);
    return;
  }

  await concludeBuild({ buildId: input.build.id });
}

/**
 * Update the usage in Stripe, also check the spend limit.
 */
async function updateUsage(project: Project) {
  const { account } = project;
  invariant(account, "No account found", UnretryableError);
  const manager = account.$getSubscriptionManager();
  const [usageBased, lock] = await Promise.all([
    manager.checkIsUsageBasedPlan(),
    getRedisLock(),
  ]);

  if (!usageBased) {
    return;
  }

  return lock.acquire(["updateUsage", account.id], async () => {
    const [totalScreenshots, spendLimitThreshold] = await Promise.all([
      manager.getCurrentPeriodScreenshots(),
      getSpendLimitThreshold(account),
    ]);

    await updateStripeUsage({ account, totalScreenshots });

    if (spendLimitThreshold !== null) {
      // @TODO send email
    }
  });
}

/**
 * Spend limit thresholds.
 */
const THRESHOLDS = [50, 75, 100] as const;

/**
 * Get the spend limit threshold that has been reached for the first time.
 */
async function getSpendLimitThreshold(
  account: Account,
): Promise<number | null> {
  const manager = account.$getSubscriptionManager();

  if (account.meteredSpendLimitByPeriod === null) {
    return null;
  }

  const [currentCost, previousUsageCost] = await Promise.all([
    manager.getAdditionalScreenshotCost(),
    manager.getAdditionalScreenshotCost({ to: "previousUsage" }),
  ]);

  const spendLimit = account.meteredSpendLimitByPeriod;
  return THRESHOLDS.reduceRight<null | number>((acc, threshold) => {
    if (acc !== null) {
      return acc;
    }
    const percent = threshold / 100;
    if (
      previousUsageCost < spendLimit * percent &&
      currentCost > spendLimit * percent
    ) {
      return threshold;
    }
    return acc;
  }, null);
}

/**
 * Sync GitLab project if needed.
 */
async function syncGitlabProject(project: Project) {
  if (!project.gitlabProjectId) {
    return;
  }
  invariant(project.gitlabProject, "no gitlabProject found", UnretryableError);

  // If the gitlab project has not been updated since 24h
  if (
    new Date(project.gitlabProject.updatedAt).getTime() >
    Date.now() - 24 * 60 * 60 * 1000
  ) {
    return;
  }

  invariant(project.account, "no account found", UnretryableError);

  const gitlabClient = await getGitlabClientFromAccount(project.account);

  if (!gitlabClient) {
    return;
  }

  const glProject = await gitlabClient.Projects.show(
    project.gitlabProject.gitlabId,
  );

  await project.gitlabProject
    .$clone()
    .$query()
    .patch(formatGlProject(glProject));
}

export async function performBuild(build: Build) {
  // Ensure that the GitHub pull request has been processed
  // to be sure we get the base branch name.
  if (build.githubPullRequestId) {
    await githubPullRequestJob.run(build.githubPullRequestId);
  }

  const [project] = await Promise.all([
    Project.query()
      .findById(build.projectId)
      .withGraphFetched("[gitlabProject, account]")
      .throwIfNotFound(),
    pushBuildNotification({ buildId: build.id, type: "progress" }),
    createBuildDiffs(build).then(async (screenshotDiffs) => {
      await pushDiffs({ build, screenshotDiffs });
    }),
  ]);

  await Promise.all([updateUsage(project), syncGitlabProject(project)]);
}

export const job = createModelJob("build", Build, performBuild);
