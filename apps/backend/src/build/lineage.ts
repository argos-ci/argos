import { Build, type ScreenshotBucket } from "@/database/models";

type LineageArgs = {
  build: Build;
  /** The build's compare bucket, which carries its name and branch. */
  compareBucket: ScreenshotBucket;
};

/**
 * Every build of the same suite's history: same project, mode and bucket
 * name, on the same branch and, when the build belongs to one, the same pull
 * request. Unordered and unbounded in time, callers pick the direction.
 *
 * Both directions read it: the previous builds whose approvals carry over, and
 * the newer build that supersedes this one. Sharing it keeps them in step, so
 * the build a reviewer is sent to always offers to reapply what they approved.
 */
export function queryBuildLineage(args: LineageArgs) {
  const { build, compareBucket } = args;

  const query = Build.query()
    .joinRelated("compareScreenshotBucket")
    // Bucket names ("default", …) are only unique within a project. Without
    // this scope, a build could inherit approvals from a same-named build of
    // another team.
    .where("builds.projectId", build.projectId)
    .where("builds.mode", build.mode)
    .where("compareScreenshotBucket.name", compareBucket.name)
    .where("compareScreenshotBucket.branch", compareBucket.branch);

  if (build.githubPullRequestId) {
    query.where("builds.githubPullRequestId", build.githubPullRequestId);
  }
  if (build.originPullRequestId) {
    query.where("builds.originPullRequestId", build.originPullRequestId);
  }

  return query;
}
