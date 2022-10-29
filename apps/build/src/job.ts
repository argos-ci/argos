import { pushBuildNotification } from "@argos-ci/build-notification";
import { Build } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";
import { job as screenshotDiffJob } from "@argos-ci/screenshot-diff";

import { createBuildDiffs } from "./createBuildDiffs.js";

export const performBuild = async (build: Build) => {
  await pushBuildNotification({ buildId: build.id, type: "progress" });

  const screenshotDiffs = await createBuildDiffs(build);
  const screenshotDiffJobs = await Promise.all(
    screenshotDiffs
      .filter(({ jobStatus }) => jobStatus !== "complete")
      .map(({ id }) => screenshotDiffJob.push(id))
  );

  if (screenshotDiffJobs.length === 0) {
    await pushBuildNotification({
      buildId: build.id,
      type: "no-diff-detected",
    });
  }
};

export const job = createModelJob("build", Build, performBuild);
