import {
  getBuildNotificationTypeFromBuildStatus,
  pushBuildNotification,
} from "@/build-notification";
import { Build, type OriginPullRequest } from "@/database/models";

/**
 * Attach to a pull request the builds already uploaded for its head commit.
 *
 * On Origin the branch is usually pushed — and built by CI — before the pull
 * request is opened, and Buildkite skips the pull request build when the
 * commit already ran. Those builds could not know their pull request: this
 * gives it to them once it exists, and replays their notification so the
 * comment lands on the pull request.
 */
export async function attachHeadBuildsToOriginPullRequest(
  pullRequest: OriginPullRequest,
  headSha: string,
) {
  const { headRef } = pullRequest;

  if (!headSha || !headRef) {
    return;
  }

  const builds = await Build.query()
    .joinRelated("[project, compareScreenshotBucket]")
    .where("project.originRepositoryId", pullRequest.originRepositoryId)
    .where("compareScreenshotBucket.commit", headSha)
    // The commit alone is not the pull request: a release pull request opened
    // from the default branch shares its head commit with the builds of that
    // branch, and those must keep belonging to it. Only builds of the head
    // branch itself are the pull request's.
    .where("compareScreenshotBucket.branch", headRef)
    // A monitoring build watches a branch, it is never a pull request check.
    .where("builds.mode", "ci")
    .whereNull("builds.originPullRequestId")
    .whereNull("builds.githubPullRequestId")
    .where("builds.mergeQueue", false)
    .select("builds.*");

  if (builds.length === 0) {
    return;
  }

  await Build.query()
    .whereIn(
      "id",
      builds.map((build) => build.id),
    )
    .patch({
      originPullRequestId: pullRequest.id,
      prNumber: pullRequest.number,
    });

  const statuses = await Build.getAggregatedBuildStatuses(builds);
  await Promise.all(
    builds.map((build, index) => {
      const status = statuses[index];
      const type = status
        ? getBuildNotificationTypeFromBuildStatus(status)
        : null;
      if (!type) {
        return null;
      }
      return pushBuildNotification({ buildId: build.id, type });
    }),
  );
}
