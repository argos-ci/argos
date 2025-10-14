import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models";

import { BuildStrategy, GetBaseResult } from "../../types";

async function getBase(build: Build): GetBaseResult {
  const lastApprovedBuild = await Build.query()
    .withGraphFetched("headArtifactBucket")
    .where("projectId", build.projectId)
    .where("name", build.name)
    .where("mode", "monitoring")
    .where("jobStatus", "complete")
    .whereNot("id", build.id)
    .whereExists(Build.submittedReviewQuery().where("state", "approved"))
    .orderBy("id", "desc")
    .first();

  if (!lastApprovedBuild) {
    return {
      baseArtifactBucket: null,
      baseBranch: null,
      baseBranchResolvedFrom: null,
    };
  }

  invariant(
    lastApprovedBuild.headArtifactBucket,
    "No headArtifactBucket found",
  );

  return {
    baseArtifactBucket: lastApprovedBuild.headArtifactBucket,
    baseBranch: null,
    baseBranchResolvedFrom: null,
  };
}

export const MonitoringStrategy: BuildStrategy<null> = {
  detect: (build) => build.mode === "monitoring",
  getContext: () => null,
  getBase,
  getBuildType: (input) => {
    if (!input.baseArtifactBucket) {
      return "orphan";
    }
    return "check";
  },
};
