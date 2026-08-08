import { invariant } from "@argos/util/invariant";
import type { Octokit } from "@octokit/rest";

import { GithubPullRequest, GithubRepository, Media } from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

import { getMediaPosterUrl } from "./serve";
import { getMediaMarkdown } from "./url";

/** How many media the comment lists before it stops growing. */
const MAX_LISTED_MEDIA = 20;

/**
 * Rebuild the comment for a pull request from every media currently attached to
 * it. Reading the full list rather than appending the new one is what makes the
 * comment converge: a deleted or expired media disappears from it on the next
 * upload.
 */
export async function updatePullRequestComment(
  githubPullRequestId: string,
): Promise<void> {
  const context = await resolveCommentContext(githubPullRequestId);
  if (!context) {
    return;
  }

  const { pullRequest, octokit, owner, repo } = context;

  const media = await Media.query()
    .where("githubPullRequestId", githubPullRequestId)
    .whereNotNull("uploadedAt")
    .orderBy("createdAt", "asc")
    .limit(MAX_LISTED_MEDIA);

  if (media.length === 0) {
    return;
  }

  const body = buildCommentBody(media);

  // Two uploads finishing at once would otherwise both read "no comment yet" and
  // both create one.
  await redisLock.acquire(
    ["media-pr-comment", githubPullRequestId],
    async () => {
      const current =
        await GithubPullRequest.query().findById(githubPullRequestId);
      invariant(current, "Pull request not found");

      if (current.mediaCommentDeleted) {
        return;
      }

      try {
        if (current.mediaCommentId) {
          await octokit.issues.updateComment({
            owner,
            repo,
            comment_id: Number.parseInt(current.mediaCommentId, 10),
            body,
          });
          return;
        }

        const { data } = await octokit.issues.createComment({
          owner,
          repo,
          issue_number: pullRequest.number,
          body,
        });
        await GithubPullRequest.query()
          .findById(githubPullRequestId)
          .patch({ mediaCommentId: String(data.id) });
      } catch (error) {
        // Somebody deleted the comment: stop recreating it. Reviewers deleting a
        // bot comment mean it, and a comment that comes back is worse than none.
        if (checkOctokitErrorStatus(404, error)) {
          await GithubPullRequest.query()
            .findById(githubPullRequestId)
            .patch({ mediaCommentDeleted: true });
          return;
        }
        // The installation lost write access to issues. Nothing to retry.
        if (checkOctokitErrorStatus(403, error)) {
          logger.info({ error }, "Media PR comment update forbidden (403)");
          return;
        }
        throw error;
      }
    },
  );
}

/**
 * Render the comment.
 *
 * Videos embed their poster frame wrapped in a link to the share page, because
 * GitHub renders an inline player only for media it hosts itself — pointing a
 * `<video>` tag at Argos produces a blank box, which is the single easiest way to
 * make this feature look broken. The poster is a CDN URL, so it needs no session:
 * GitHub fetches embedded images server-side, with no cookie of ours.
 */
function buildCommentBody(media: Media[]): string {
  const entries = media.map((item) => {
    const markdown = getMediaMarkdown({
      name: item.name,
      shareUrl: item.url,
      posterUrl: getMediaPosterUrl(item),
      isVideo: item.isVideo(),
    });
    return `| ${escapeCell(item.name)} | ${markdown} |`;
  });

  return [
    "**Media uploaded by Argos**",
    "",
    "| Name | Preview |",
    "| --- | --- |",
    ...entries,
    "",
    "<sub>Uploaded with [Argos ↗︎](https://argos-ci.com/docs/learn/media/standalone-media-upload). This comment is updated in place.</sub>",
  ].join("\n");
}

/** A pipe inside a cell would split it into two columns. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/**
 * Resolve everything needed to talk to GitHub about a pull request, or `null` when
 * the repository is no longer reachable (installation removed, repository
 * deleted). A missing installation is a normal state, not a failure.
 */
async function resolveCommentContext(githubPullRequestId: string): Promise<{
  pullRequest: GithubPullRequest;
  octokit: Octokit;
  owner: string;
  repo: string;
} | null> {
  const pullRequest = await GithubPullRequest.query()
    .findById(githubPullRequestId)
    .withGraphFetched(
      "githubRepository.[githubAccount, repoInstallations.installation]",
    );

  if (!pullRequest?.githubRepository?.githubAccount) {
    return null;
  }

  const installation = GithubRepository.pickBestInstallation(
    pullRequest.githubRepository,
  );

  if (!installation) {
    return null;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    return null;
  }

  return {
    pullRequest,
    octokit,
    owner: pullRequest.githubRepository.githubAccount.login,
    repo: pullRequest.githubRepository.name,
  };
}
