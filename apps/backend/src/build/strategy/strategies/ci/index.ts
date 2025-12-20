import { invariant } from "@argos/util/invariant";
import { minimatch } from "minimatch";

import { UnretryableError } from "@/job-core";

import { BuildStrategy } from "../../types";
import { getCIBase } from "./base";
import { getCIMergeQueueBase } from "./merge-queue";

export type CIStrategyContext = {
  checkIsAutoApproved: (branch: string) => boolean;
};

export const CIStrategy: BuildStrategy<CIStrategyContext> = {
  detect: (build) => build.mode === "ci",
  getContext: async (build) => {
    await build.$fetchGraph("project", { skipFetched: true });
    invariant(build.project, "no project found", UnretryableError);
    const branchGlob = await build.project.$getAutoApprovedBranchGlob();
    return {
      checkIsAutoApproved: (branch: string) => {
        // If there is a pull request, we never auto-approve the build.
        if (build.githubPullRequestId) {
          return false;
        }

        return minimatch(branch, branchGlob);
      },
    };
  },
  getBuildType: (input, ctx) => {
    if (ctx.checkIsAutoApproved(input.compareScreenshotBucket.branch)) {
      return "reference";
    }
    if (!input.baseBucket) {
      return "orphan";
    }
    return "check";
  },
  getBase: async (build, context) => {
    const richBuild = await build
      .$query()
      .withGraphFetched("[project,compareScreenshotBucket,pullRequest]");

    const { project, compareScreenshotBucket, pullRequest = null } = richBuild;

    invariant(
      compareScreenshotBucket,
      "no compare screenshot bucket found",
      UnretryableError,
    );
    invariant(project, "no project found", UnretryableError);

    const args = {
      build,
      compareScreenshotBucket,
      project,
      pullRequest,
      context,
    };

    if (build.mergeQueue) {
      return getCIMergeQueueBase(args);
    }

    return getCIBase(args);
  },
};
