import { Build, GithubPullRequest, ScreenshotBucket } from "@/database/models";

/**
 * Get the base bucket for a build and a commit.
 */
export async function getBaseBucketForBuildAndCommit(
  build: Build,
  commit: string,
  options?: QueryBaseBucketOptions,
) {
  const bucket = await queryBaseBucket(build, options).findOne((qb) => {
    // Try to find a bucket for the commit
    qb.where("commit", commit)
      // Try to find a build by "prHeadCommit"
      // If build is triggered by a pull request,
      // then the relevant commit is "prHeadCommit"
      .orWhereIn(
        "id",
        Build.query().select("compareScreenshotBucketId").findOne({
          projectId: build.projectId,
          name: build.name,
          prHeadCommit: commit,
          mode: build.mode,
        }),
      );
  });
  return bucket ?? null;
}

type QueryBaseBucketOptions = {
  /**
   * Only return buckets from approved builds.
   */
  approved?: true | undefined;
};

/**
 * Query the base bucket from a build.
 */
export function queryBaseBucket(
  build: Build,
  options?: QueryBaseBucketOptions,
) {
  const query = ScreenshotBucket.query()
    .where({
      projectId: build.projectId,
      name: build.name,
      complete: true,
      valid: true,
      mode: build.mode,
    })
    .orderBy("id", "desc");

  const buildQuery = Build.query()
    .select("compareScreenshotBucketId")
    .where("projectId", build.projectId)
    .where("name", build.name)
    .where("mode", build.mode)
    .where("jobStatus", "complete")
    .whereNot("id", build.id)
    .whereNot("type", "skipped");

  if (options?.approved) {
    buildQuery.where((qb) => {
      // We consider as approved:
      // - reference (auto-approved)
      // - orphans
      // - checks that have an approved review or a merged pull request
      qb.whereIn("type", ["reference", "orphan"]).orWhere((qb) => {
        qb.where("type", "check").where((qb) =>
          qb
            // An approved review exists
            .whereExists(
              Build.submittedReviewQuery().where("state", "approved"),
            )
            // Or the associated pull request is merged
            .orWhereExists(
              GithubPullRequest.query()
                .whereRaw(
                  'builds."githubPullRequestId" = github_pull_requests."id"',
                )
                .where("merged", true),
            ),
        );
      });
    });
  }

  query.whereIn("id", buildQuery);

  return query;
}

/**
 * Get the bucket from a list of commits, ordered by the order of the commits.
 */
export async function getBucketFromCommits(args: {
  shas: string[];
  build: Build;
}) {
  if (args.shas.length === 0) {
    return null;
  }
  const bucket = await queryBaseBucket(args.build)
    .whereIn("commit", args.shas)
    .joinRaw(
      `join (values ${args.shas
        .map((sha, index) => `('${sha}',${index})`)
        .join(",")}) as ordering(sha, rank) on commit = ordering.sha`,
    )
    .orderBy("ordering.rank")
    .orderBy("id", "desc")
    .first();
  return bucket ?? null;
}
