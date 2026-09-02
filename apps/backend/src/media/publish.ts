import { isUniqueViolationError } from "@/database/error";
import { Media, Project } from "@/database/models";
import { GithubPullRequest } from "@/database/models/GithubPullRequest";
import logger from "@/logger";

import { updatePullRequestComment } from "./pull-request-comment";
import { uploadedVersions } from "./query";

/**
 * Publish a branch's staged media to the pull request that is already open for
 * it, if there is one.
 *
 * The other direction of {@link publishBranchMedia}, and the feature does not
 * work without both. That one fires when a pull request arrives and asks "what
 * is waiting on this branch"; this one fires when media arrives and asks "is
 * there already a pull request for it". Uploading to a branch whose pull request
 * opened an hour ago is at least as common as the reverse, and nothing would
 * ever have connected them.
 *
 * Called once the bytes land, because that is when the media becomes something
 * the comment can show.
 */
export async function publishMediaForBranch(args: {
  githubRepositoryId: string;
  branch: string;
}): Promise<number> {
  const pullRequest = await GithubPullRequest.query()
    .where("githubRepositoryId", args.githubRepositoryId)
    .where("headRef", args.branch)
    .where("headFromFork", false)
    .whereNot("state", "closed")
    // Newest wins if a branch somehow has two open pull requests: it is the one
    // people are looking at.
    .orderBy("number", "desc")
    .first();

  if (!pullRequest) {
    return 0;
  }

  return publishBranchMedia(pullRequest);
}

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
  const { headRef, headFromFork, githubRepositoryId } = pullRequest;

  if (!headRef) {
    return 0;
  }

  // A fork's head branch name is chosen by whoever opened the pull request, and
  // they need no relationship with the Argos account at all. Matching staged
  // media on it would let an outsider fork a public repository, push a branch
  // called `feat/checkout`, open a pull request, and have the team's staged
  // media — share URLs included — attached to it and posted in its comment.
  // Only a branch in the base repository is the team's own.
  if (headFromFork !== false) {
    return 0;
  }

  // Through the projects on this repository, not globally: a branch name is not
  // unique across an installation, and `feat/checkout` in one repository must
  // never publish to another's pull request. More than one project can point at
  // one repository, and what is staged on each belongs on this pull request.
  const projects = await Project.queryNotDeleted()
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
    .whereExists(uploadedVersions());

  if (staged.length === 0) {
    return 0;
  }

  // One at a time, and tolerating exactly one failure: identity is
  // `(project, pull request, name, state)`, so a staged media whose name is
  // already taken on this pull request — someone uploaded it there directly in
  // the meantime — cannot be attached. It stays staged rather than taking the
  // whole batch down with it.
  //
  // Everything else rethrows. Swallowing a connection reset or a lock timeout
  // here would report a successful no-op: the job completes, nothing retries,
  // and the media are never published — with only an `info` log to say so.
  // Failing loudly is what lets `githubPullRequestJob` run again.
  let published = 0;
  for (const media of staged) {
    try {
      await media.$query().patch({ githubPullRequestId: pullRequest.id });
      published += 1;
    } catch (error) {
      if (!isUniqueViolationError(error)) {
        throw error;
      }
      logger.info(
        { mediaId: media.id, pullRequestId: pullRequest.id },
        "A media of that name is already on this pull request; leaving it staged",
      );
    }
  }

  if (published > 0) {
    await updatePullRequestComment(pullRequest.id);
  }

  return published;
}
