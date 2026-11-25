import { BuildStrategy } from "../../types";
import { getCIBase } from "./base";
import { getCIMergeQueueBase } from "./merge-queue";

export type CIStrategyContext = {
  /** Whether this build, pushed to `branch`, is auto-approved. */
  checkIsAutoApproved: (branch: string) => boolean;
  /** Whether the project auto-approves builds of `branch`, whatever the build. */
  isAutoApprovedBranch: (branch: string) => boolean;
};

export const CIStrategy: BuildStrategy<CIStrategyContext> = {
  detect: (build) => build.mode === "ci",
  getContext: async (build) => {
    const { project } = await build.$fetchGraph("project", {
      skipFetched: true,
    });
    const isAutoApprovedBranch = await project.$getAutoApprovedBranchMatcher();
    return {
      isAutoApprovedBranch,
      checkIsAutoApproved: (branch: string) => {
        // If there is a pull request, we never auto-approve the build.
        if (build.githubPullRequestId || build.originPullRequestId) {
          return false;
        }

        return isAutoApprovedBranch(branch);
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
      .withGraphFetched(
        "[project,compareScreenshotBucket,pullRequest,originPullRequest]",
      );

    const {
      project,
      compareScreenshotBucket,
      pullRequest = null,
      originPullRequest = null,
    } = richBuild;

    const args = {
      build,
      compareScreenshotBucket,
      project,
      pullRequest: pullRequest ?? originPullRequest,
      context,
    };

    if (build.mergeQueue) {
      return getCIMergeQueueBase(args);
    }

    return getCIBase(args);
  },
};
