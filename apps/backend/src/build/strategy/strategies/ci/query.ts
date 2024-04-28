import { Build, ScreenshotBucket } from "@/database/models/index.js";

/**
 * Get the base bucket for a build and a commit.
 */
export async function getBaseBucketForBuildAndCommit(
  build: Build,
  commit: string,
) {
  const bucket = await queryBaseBucket(build).findOne((qb) => {
    // Try to find a bucket for the commit
    qb.where("commit", commit)
      // Try to find a build by "prHeadCommit"
      // If reference build is triggered by a pull request,
      // then the relevant commit is "prHeadCommit"
      .orWhereIn(
        "id",
        Build.query().select("compareScreenshotBucketId").findOne({
          projectId: build.projectId,
          name: build.name,
          prHeadCommit: commit,
        }),
      );
  });
  return bucket ?? null;
}

/**
 * Query the base bucket from a build.
 */
export function queryBaseBucket(build: Build) {
  return ScreenshotBucket.query().where({
    projectId: build.projectId,
    name: build.name,
    complete: true,
  });
}
