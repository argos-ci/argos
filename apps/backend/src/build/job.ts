import { invariant } from "@argos/util/invariant";

import { pushBuildNotification } from "@/build-notification/index.js";
import { Build, Project, ScreenshotDiff } from "@/database/models/index.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { createModelJob, UnretryableError } from "@/job-core/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";
import { updateStripeUsage } from "@/stripe/index.js";

import { createBuildDiffs } from "./createBuildDiffs.js";

/**
 * Pushes the diffs to the screenshot-diff job queue.
 * If there is no diff to proceed, it pushes a notification.
 */
async function pushDiffs(buildId: string, screenshotDiffs: ScreenshotDiff[]) {
  if (screenshotDiffs.length === 0) {
    await pushBuildNotification({ buildId, type: "no-diff-detected" });
    return;
  }

  const toProcessedDiffs = screenshotDiffs
    .filter(({ jobStatus }) => jobStatus !== "complete")
    .map(({ id }) => screenshotDiffJob.push(id));

  if (toProcessedDiffs.length > 0) {
    await Promise.all(toProcessedDiffs);
    return;
  }

  await ScreenshotDiff.fetchGraph(screenshotDiffs, "compareScreenshot");
  const statuses = await Promise.all(
    screenshotDiffs.map((screenshotDiff) => screenshotDiff.$getDiffStatus()),
  );

  const type = statuses.some(
    (status) => status === "added" || status === "removed",
  )
    ? ("diff-detected" as const)
    : ("no-diff-detected" as const);

  await pushBuildNotification({ buildId, type });
}

/**
 * Update the stripe usage if needed.
 */
async function updateProjectConsumption(project: Project) {
  const { account } = project;
  invariant(account, "No account found", UnretryableError);
  const manager = account.$getSubscriptionManager();

  const [usageBased, totalScreenshots] = await Promise.all([
    manager.checkIsUsageBasedPlan(),
    manager.getCurrentPeriodScreenshots(),
  ]);

  if (usageBased) {
    await updateStripeUsage({ account, totalScreenshots });
  }
}

/**
 * Sync GitLab project if needed.
 */
async function syncGitlabProject(project: Project) {
  if (!project.gitlabProjectId) return;
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

  if (!gitlabClient) return;

  const glProject = await gitlabClient.Projects.show(
    project.gitlabProject.gitlabId,
  );

  await project.gitlabProject
    .$clone()
    .$query()
    .patch(formatGlProject(glProject));
}

export async function performBuild(build: Build) {
  const [, screenshotDiffs, project] = await Promise.all([
    pushBuildNotification({ buildId: build.id, type: "progress" }),
    createBuildDiffs(build),
    Project.query()
      .findById(build.projectId)
      .withGraphFetched("[gitlabProject, account]")
      .throwIfNotFound(),
  ]);

  await Promise.all([
    pushDiffs(build.id, screenshotDiffs),
    updateProjectConsumption(project),
    syncGitlabProject(project),
  ]);
}

export const job = createModelJob("build", Build, performBuild);
