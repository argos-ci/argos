import { invariant } from "@argos/util/invariant";

import { pushBuildNotification } from "@/build-notification/index.js";
import { Build, Project, ScreenshotDiff } from "@/database/models/index.js";
import { getSpendLimitThreshold } from "@/database/services/spend-limit.js";
import { job as githubPullRequestJob } from "@/github-pull-request/job.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";
import { sendNotification } from "@/notification/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";
import { updateStripeUsage } from "@/stripe/index.js";
import { redisLock } from "@/util/redis/index.js";

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

  await concludeBuild({ build: input.build });
}

/**
 * Update the usage in Stripe, also check the spend limit.
 */
async function updateUsage(project: Project) {
  const { account } = project;
  invariant(account, "No account found", UnretryableError);
  const manager = account.$getSubscriptionManager();
  const isUsageBased = await manager.checkIsUsageBasedPlan();

  if (!isUsageBased) {
    return;
  }

  return redisLock.acquire(["updateUsage", account.id], async () => {
    const [screenshots, includedScreenshots, spendLimitThreshold] =
      await Promise.all([
        manager.getCurrentPeriodScreenshots(),
        manager.getIncludedScreenshots(),
        getSpendLimitThreshold({ account, comparePreviousUsage: true }),
      ]);

    await updateStripeUsage({ account, screenshots, includedScreenshots });

    if (spendLimitThreshold !== null) {
      const ownerIds = await account.$getOwnerIds();
      await sendNotification({
        type: "spend_limit",
        data: {
          accountName: account.name,
          accountSlug: account.slug,
          blockWhenSpendLimitIsReached: account.blockWhenSpendLimitIsReached,
          threshold: spendLimitThreshold,
        },
        recipients: ownerIds,
      });
    }
  });
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
