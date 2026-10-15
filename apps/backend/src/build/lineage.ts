import { raw } from "objection";

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
    // Always true of a build's own bucket, and stated anyway: without it the
    // branch lookup cannot use `screenshot_buckets_projectid_branch_name_idx`
    // and falls back to the trigram index, across every project's buckets.
    .where("compareScreenshotBucket.projectId", build.projectId)
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

/**
 * The build to look at instead of this one, when there is one: the latest run
 * of the most recent commit of its lineage.
 *
 * A commit is as recent as its first build, not its latest. CI can re-run the
 * workflow of an older commit after newer ones were pushed, and that run, the
 * newest build of the lineage, holds code the pull request has moved past:
 * pointing at it would send the reviewer back.
 *
 * Only builds someone reviews against a pull request or a branch get one:
 * reference builds (the base branch, auto-approved) and monitoring builds both
 * have a newer build almost all the time, and pointing at it would only be
 * noise. Merge queue builds sit on a branch of their own.
 */
export async function getNewerBuild(args: LineageArgs): Promise<Build | null> {
  const { build, compareBucket } = args;

  if (
    !compareBucket.branch ||
    build.type === "reference" ||
    build.mode !== "ci" ||
    build.mergeQueue
  ) {
    return null;
  }

  const lineage = queryBuildLineage({ build, compareBucket })
    .select(
      "builds.id",
      "builds.createdAt",
      // The commit a build reviews, as `Build.commit` resolves it.
      raw("coalesce(??, ??) as ??", [
        "builds.prHeadCommit",
        "compareScreenshotBucket.commit",
        "commit",
      ]),
    )
    // The bucket already carries this name, the build repeats it: filtering on
    // the build too lets the builds indexes that carry the name narrow the
    // join, instead of reading every build of the project's buckets.
    .where("builds.name", build.name);

  const latestBuild = await Build.query()
    .with("lineage", lineage)
    .with("commits", (qb) =>
      qb
        .from("lineage")
        .select("commit", raw("min(??) as ??", ["createdAt", "firstBuiltAt"]))
        .groupBy("commit"),
    )
    .join("lineage", "lineage.id", "builds.id")
    .join("commits", "commits.commit", "lineage.commit")
    .select("builds.*")
    .orderBy("commits.firstBuiltAt", "desc")
    .orderBy("builds.createdAt", "desc")
    .orderBy("builds.id", "desc")
    .first();

  if (!latestBuild || latestBuild.id === build.id) {
    return null;
  }
  return latestBuild;
}
