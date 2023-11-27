import { pushBuildNotification } from "@/build-notification/index.js";
import { Build, Project, ScreenshotDiff } from "@/database/models/index.js";
import { UnretryableError, createModelJob } from "@/job-core/index.js";
import { job as screenshotDiffJob } from "@/screenshot-diff/index.js";
import { updateStripeUsage } from "@/stripe/index.js";

import { createBuildDiffs } from "./createBuildDiffs.js";
import { formatGlProject, getGitlabClientFromAccount } from "@/gitlab/index.js";
import { invariant } from "@/util/invariant.js";

const pushDiffs = async (
  buildId: string,
  screenshotDiffs: ScreenshotDiff[],
) => {
  const toProcessedDiffs = screenshotDiffs
    .filter(({ jobStatus }) => jobStatus !== "complete")
    .map(({ id }) => screenshotDiffJob.push(id));

  if (toProcessedDiffs.length > 0) {
    await Promise.all(toProcessedDiffs);
  } else {
    await pushBuildNotification({
      buildId,
      type: "no-diff-detected",
    });
  }
};

const updateProjectConsumption = async (project: Project) => {
  const { account } = project;
  invariant(account, "No account found", UnretryableError);
  const subscription = account.$getSubscription();

  const [usageBased, totalScreenshots] = await Promise.all([
    subscription.checkIsUsageBasedPlan(),
    subscription.getCurrentPeriodScreenshots(),
  ]);

  if (usageBased) {
    await updateStripeUsage({ account, totalScreenshots });
  }
};

/**
 * Sync GitLab project if needed.
 */
const syncGitlabProject = async (project: Project) => {
  if (!project.gitlabProjectId) return;

  if (!project.gitlabProject) {
    throw new UnretryableError("Invariant: no gitlabProject found");
  }

  // If the gitlab project has not been updated since 24h
  if (
    new Date(project.gitlabProject.updatedAt).getTime() >
    Date.now() - 24 * 60 * 60 * 1000
  ) {
    return;
  }

  if (!project.account) {
    throw new UnretryableError("Invariant: no account found");
  }

  const gitlabClient = await getGitlabClientFromAccount(project.account);

  if (!gitlabClient) return;

  const glProject = await gitlabClient.Projects.show(
    project.gitlabProject.gitlabId,
  );

  await project.gitlabProject
    .$clone()
    .$query()
    .patch(formatGlProject(glProject));
};

export const performBuild = async (build: Build) => {
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
};

export const job = createModelJob("build", Build, performBuild);
