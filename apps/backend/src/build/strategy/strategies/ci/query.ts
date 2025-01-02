import { Build, ScreenshotBucket } from "@/database/models/index.js";

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
  const query = ScreenshotBucket.query().where({
    projectId: build.projectId,
    name: build.name,
    complete: true,
    valid: true,
    mode: build.mode,
  });

  if (options?.approved) {
    query.whereIn(
      "id",
      // List approved builds
      Build.query()
        .select("compareScreenshotBucketId")
        .where("projectId", build.projectId)
        .where("name", build.name)
        .where("mode", build.mode)
        .where("jobStatus", "complete")
        .whereNot("id", build.id)
        .where((qb) => {
          // Reference build or check build with approved review
          qb.where("type", "reference").orWhere((qb) => {
            qb.where("type", "check").whereExists(
              Build.hasTheLastReviewOfState(["approved"]),
            );
          });
        }),
    );
  }

  return query;
}
