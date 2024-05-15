import { invariant } from "@argos/util/invariant";

import { Build, ScreenshotDiff } from "@/database/models";

import { BuildStrategy } from "../../types";

async function getBaseScreenshotBucket(build: Build) {
  const lastApprovedBuild = await Build.query()
    .withGraphFetched("compareScreenshotBucket")
    .where("projectId", build.projectId)
    .where("name", build.name)
    .where("mode", "monitoring")
    .where("jobStatus", "complete")
    .whereNot("id", build.id)
    .whereExists(
      ScreenshotDiff.query()
        .select(1)
        .whereRaw('"buildId" = builds.id')
        .where("validationStatus", "accepted"),
    )
    .orderBy("id", "desc")
    .first();

  if (!lastApprovedBuild) {
    return null;
  }

  invariant(
    lastApprovedBuild.compareScreenshotBucket,
    "No compareScreenshotBucket found",
  );

  return lastApprovedBuild.compareScreenshotBucket;
}

export const MonitoringStrategy: BuildStrategy<null> = {
  detect: (build) => build.mode === "monitoring",
  getContext: () => null,
  getBaseScreenshotBucket,
  getBuildType: (input) => {
    if (!input.baseScreenshotBucket) {
      return "orphan";
    }
    return "check";
  },
};
