import { Media, MediaVersion, Project } from "@/database/models";
import type { GithubPullRequest } from "@/database/models/GithubPullRequest";
import logger from "@/logger";

import { updatePullRequestComment } from "./pull-request-comment";

/**
 * Attach a branch's staged media to the pull request that just opened for it,
 * and post the comment listing them.
 *
 * This is what makes uploading before the pull request exists worth doing. An
 * agent working on `feat/checkout` uploads its screenshots as it goes; whether a
 * pull request ever opens is not its problem, and it should not have to come back
 * later to wire the two together. Opening the pull request is the event that
 * connects them.
 *
 * Runs when the pull request's data lands from GitHub, because that is when its
 * head branch is known — Argos only ever stored the base branch before.
 *
 * Idempotent: a media that already has a pull request is no longer staged and is
 * left alone, so re-processing a pull request republishes nothing.
 */
export async function publishBranchMedia(
  pullRequest: GithubPullRequest,
): Promise<number> {
  const { headRef, githubRepositoryId } = pullRequest;

  if (!headRef) {
    return 0;
  }

  // Through the projects on this repository, not globally: a branch name is not
  // unique across an installation, and `feat/checkout` in one repository must
  // never publish to another's pull request. More than one project can point at
  // one repository, and what is staged on each belongs on this pull request.
  const projects = await Project.query()
    .select("id")
    .where("githubRepositoryId", githubRepositoryId);

  if (projects.length === 0) {
    return 0;
  }

  const staged = await Media.query()
    .whereIn(
      "projectId",
      projects.map((project) => project.id),
    )
    .where("branch", headRef)
    .whereNull("githubPullRequestId")
    // Only what actually landed. A media created to sign an upload that never
    // completed has nothing to show, and publishing it would put a row in the
    // comment for bytes that do not exist.
    .whereExists(
      MediaVersion.query()
        .select(1)
        .whereColumn("media_versions.mediaId", "media.id")
        .whereNotNull("media_versions.uploadedAt"),
    );

  if (staged.length === 0) {
    return 0;
  }

  // One at a time, and tolerating a failure: identity is
  // `(project, pull request, name, state)`, so a staged media whose name is
  // already taken on this pull request — someone uploaded it there directly in
  // the meantime — cannot be attached. It stays staged rather than taking the
  // whole batch down with it.
  let published = 0;
  for (const media of staged) {
    try {
      await media.$query().patch({ githubPullRequestId: pullRequest.id });
      published += 1;
    } catch (error) {
      logger.info(
        { mediaId: media.id, pullRequestId: pullRequest.id, error },
        "Could not publish a staged media to its pull request",
      );
    }
  }

  if (published > 0) {
    await updatePullRequestComment(pullRequest.id);
  }

  return published;
}
