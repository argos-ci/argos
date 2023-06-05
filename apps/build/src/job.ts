import { pushBuildNotification } from "@argos-ci/build-notification";
import { Build, Project } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";
import { job as screenshotDiffJob } from "@argos-ci/screenshot-diff";
import { updateStripeUsage } from "@argos-ci/stripe";

import { createBuildDiffs } from "./createBuildDiffs.js";

export const performBuild = async (build: Build) => {
  await pushBuildNotification({ buildId: build.id, type: "progress" });

  const screenshotDiffs = await createBuildDiffs(build);
  const screenshotDiffJobs = await Promise.all(
    screenshotDiffs
      .filter(({ jobStatus }) => jobStatus !== "complete")
      .map(({ id }) => screenshotDiffJob.push(id))
  );

  const project = await Project.query()
    .findById(build.projectId)
    .throwIfNotFound();

  const isPublic = await project.$checkIsPublic();
  if (!isPublic) {
    const account = await project.$relatedQuery("account").throwIfNotFound();

    const hasExceedLimit = await account.$hasExceedScreenshotsMonthlyLimit();
    const hasUsageBasedPlan = await account.$hasUsageBasedPlan();
    const totalScreenshots = await account.$getScreenshotsCurrentConsumption();
    if (hasExceedLimit && hasUsageBasedPlan) {
      await updateStripeUsage({ account, totalScreenshots });
    }
  }

  if (screenshotDiffJobs.length === 0) {
    await pushBuildNotification({
      buildId: build.id,
      type: "no-diff-detected",
    });
  }
};

export const job = createModelJob("build", Build, performBuild);
