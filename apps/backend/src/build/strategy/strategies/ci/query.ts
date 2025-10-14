import { ArtifactBucket, Build } from "@/database/models/index.js";

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
        Build.query().select("headArtifactBucketId").findOne({
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
  const query = ArtifactBucket.query().where({
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
        .select("headArtifactBucketId")
        .where("projectId", build.projectId)
        .where("name", build.name)
        .where("mode", build.mode)
        .where("jobStatus", "complete")
        .whereNot("id", build.id)
        .where((qb) => {
          // We consider as approved:
          // - reference buckets
          // - orphan buckets
          // - check buckets that have an approved review
          qb.whereIn("type", ["reference", "orphan"]).orWhere((qb) => {
            qb.where("type", "check").whereExists(
              Build.submittedReviewQuery().where("state", "approved"),
            );
          });
        }),
    );
  }

  return query;
}
