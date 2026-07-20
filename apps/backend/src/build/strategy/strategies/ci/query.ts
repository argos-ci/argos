import {
  Build,
  GithubPullRequest,
  ScreenshotBucket,
  type BuildMode,
} from "@/database/models";

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
 * Query the builds eligible to be used as a baseline.
 *
 * These are the intrinsic (per-build) criteria mirrored by
 * `baselineEligibility.ts`. Commit ancestry is not handled here as it depends
 * on the build being compared against.
 *
 * Columns are qualified with the `builds` table so the query can safely be
 * used both as a sub-query and joined to other relations.
 */
function queryEligibleBaselineBuilds(args: {
  projectId: string;
  name: string;
  mode: BuildMode;
  /**
   * Only return approved builds (reference, orphan, or a check with an
   * approved review or a merged pull request).
   */
  approved?: boolean | undefined;
}) {
  const query = Build.query()
    .where("builds.projectId", args.projectId)
    .where("builds.name", args.name)
    .where("builds.mode", args.mode)
    .where("builds.jobStatus", "complete")
    .where("builds.subset", false)
    .whereNot("builds.type", "skipped")
    // A build with an active (non-dismissed) rejection can never be used as a
    // baseline, whatever its type and even when an explicit approval is not
    // required (e.g. auto-approved branches or the ancestor-commit fallback).
    .whereNotExists(Build.rejectedReviewQuery());

  if (args.approved) {
    query.where((qb) => {
      // We consider as approved:
      // - reference (auto-approved)
      // - orphans
      // - checks that have an approved review or a merged pull request
      qb.whereIn("builds.type", ["reference", "orphan"]).orWhere((qb) => {
        qb.where("builds.type", "check").where((qb) =>
          qb
            // An approved review exists
            .whereExists(Build.acceptedReviewQuery())
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

  return query;
}

/**
 * Query the base bucket from a build.
 */
function queryBaseBucket(build: Build, options?: QueryBaseBucketOptions) {
  const query = ScreenshotBucket.query()
    .where({
      projectId: build.projectId,
      name: build.name,
      complete: true,
      valid: true,
      mode: build.mode,
    })
    .orderBy("id", "desc");

  const buildQuery = queryEligibleBaselineBuilds({
    projectId: build.projectId,
    name: build.name,
    mode: build.mode,
    approved: options?.approved,
  })
    .select("compareScreenshotBucketId")
    .whereNot("builds.id", build.id);

  query.whereIn("id", buildQuery);

  return query;
}

/**
 * Get the base bucket from a previous approved build on the same commit and
 * branch as the compared bucket.
 *
 * Used as a last resort when no other baseline is found: two builds run on the
 * same commit and branch (typically while setting up Argos locally) are
 * compared with each other instead of both ending up orphans.
 */
export async function getSameCommitBaseBucket(
  build: Build,
  compareScreenshotBucket: ScreenshotBucket,
) {
  const bucket = await queryBaseBucket(build, { approved: true }).findOne({
    commit: compareScreenshotBucket.commit,
    branch: compareScreenshotBucket.branch,
  });
  return bucket ?? null;
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
  const valuesClause = args.shas.map(() => "(?, ?)").join(",");
  const bindings: (string | number)[] = [];
  args.shas.forEach((sha, index) => {
    bindings.push(sha, index);
  });
  const bucket = await queryBaseBucket(args.build)
    .whereIn("commit", args.shas)
    .joinRaw(
      `join (values ${valuesClause}) as ordering(sha, rank) on commit = ordering.sha`,
      bindings,
    )
    .orderBy("ordering.rank")
    .orderBy("id", "desc")
    .first();
  return bucket ?? null;
}

/**
 * Find the build eligible to be used as a baseline among a list of commits.
 *
 * Commits are searched in the order they are given: the first commit that has
 * an eligible baseline build wins. When several builds exist for the winning
 * commit, the most recent one is returned. Returns null when none of the
 * commits has an eligible baseline build.
 */
export async function getEligibleBaselineBuildFromCommits(args: {
  projectId: string;
  name: string;
  mode: BuildMode;
  shas: string[];
}): Promise<Build | null> {
  if (args.shas.length === 0) {
    return null;
  }

  const valuesClause = args.shas.map(() => "(?, ?)").join(",");
  const bindings: (string | number)[] = [];
  args.shas.forEach((sha, index) => {
    bindings.push(sha, index);
  });

  const match = await queryEligibleBaselineBuilds({
    projectId: args.projectId,
    name: args.name,
    mode: args.mode,
    approved: true,
  })
    .joinRelated("compareScreenshotBucket")
    // The baseline bucket must be a complete and valid one (tests passed).
    .where("compareScreenshotBucket.complete", true)
    .where("compareScreenshotBucket.valid", true)
    .whereIn("compareScreenshotBucket.commit", args.shas)
    .joinRaw(
      `join (values ${valuesClause}) as ordering(sha, rank) on "compareScreenshotBucket"."commit" = ordering.sha`,
      bindings,
    )
    .select("builds.id")
    .orderBy("ordering.rank")
    .orderBy("builds.id", "desc")
    .first();

  if (!match) {
    return null;
  }

  const build = await Build.query()
    .withGraphFetched(
      "[project.account, compareScreenshotBucket, baseScreenshotBucket]",
    )
    .findById(match.id);

  return build ?? null;
}
