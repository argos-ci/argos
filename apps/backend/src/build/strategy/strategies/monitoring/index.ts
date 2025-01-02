import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models";

import { BuildStrategy, GetBaseResult } from "../../types";

async function getBase(build: Build): GetBaseResult {
  const lastApprovedBuild = await Build.query()
    .withGraphFetched("compareScreenshotBucket")
    .where("projectId", build.projectId)
    .where("name", build.name)
    .where("mode", "monitoring")
    .where("jobStatus", "complete")
    .whereNot("id", build.id)
    .whereExists(Build.hasTheLastReviewOfState(["approved"]))
    .orderBy("id", "desc")
    .first();

  if (!lastApprovedBuild) {
    return {
      baseScreenshotBucket: null,
      baseBranch: null,
      baseBranchResolvedFrom: null,
    };
  }

  invariant(
    lastApprovedBuild.compareScreenshotBucket,
    "No compareScreenshotBucket found",
  );

  return {
    baseScreenshotBucket: lastApprovedBuild.compareScreenshotBucket,
    baseBranch: null,
    baseBranchResolvedFrom: null,
  };
}

export const MonitoringStrategy: BuildStrategy<null> = {
  detect: (build) => build.mode === "monitoring",
  getContext: () => null,
  getBase,
  getBuildType: (input) => {
    if (!input.baseScreenshotBucket) {
      return "orphan";
    }
    return "check";
  },
};
