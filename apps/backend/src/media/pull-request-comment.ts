import { invariant } from "@argos/util/invariant";
import type { Octokit } from "@octokit/rest";

import {
  GithubPullRequest,
  GithubRepository,
  Media,
  MediaVersion,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

import { liveProject, uploadedVersions } from "./query";
import { getMediaEmbedArgs } from "./serve";
import {
  getMediaTableMarkdown,
  type MediaEmbedArgs,
  type MediaMarkdownGroup,
} from "./url";
import { getLatestMediaVersions } from "./version";

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
    .whereExists(uploadedVersions())
    // The setting the build and deployment paths both honour, and the media
    // path did not: an owner who turned Argos pull request comments off was
    // still getting them. Per project, because one pull request can carry media
    // from several — the ones that opted out, and the ones that were deleted,
    // drop out of the table rather than suppressing the whole comment.
    .whereExists(liveProject().where("projects.prCommentEnabled", true))
    .orderBy("createdAt", "asc")
    .limit(MAX_LISTED_MEDIA);

  if (media.length === 0) {
    return;
  }

  // The comment always shows the newest upload of each media, which is what makes
  // re-uploading after a review update the pull request without touching it.
  const latestVersions = await getLatestMediaVersions(
    media.map((item) => item.id),
  );

  const body = buildCommentBody(media, latestVersions);

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
 * A before/after pair shares a name, so the two are shown in one row side by side
 * — which is the whole reason `state` exists, and reads far better than two
 * unrelated rows a reviewer has to match up themselves.
 *
 * Each cell is a CDN picture linked to its share page;
 * {@link getMediaTableMarkdown} owns why it is built that way.
 */
function buildCommentBody(
  media: Media[],
  latestVersions: Map<string, MediaVersion>,
): string {
  const embed = (item: Media | null): MediaEmbedArgs | null => {
    if (!item) {
      return null;
    }
    const version = latestVersions.get(item.id);
    if (!version) {
      return null;
    }
    return getMediaEmbedArgs({
      name: item.name,
      shareUrl: item.url,
      version,
    });
  };

  const groups = groupByPair(media).flatMap((group): MediaMarkdownGroup[] => {
    const item = group.after ?? group.before;
    invariant(item, "a group has at least one media");
    const before = embed(group.before);
    const after = embed(group.after);
    if (!before && !after) {
      return [];
    }
    return [
      {
        name: item.name,
        // The description belongs to the pair, not to either half.
        description:
          group.after?.description ?? group.before?.description ?? null,
        before,
        after,
      },
    ];
  });

  const versionNote = media.some(
    (item) => (latestVersions.get(item.id)?.number ?? 1) > 1,
  )
    ? " Re-uploading a screenshot adds a version, and this comment always shows the newest."
    : "";

  return [
    formatCommentTitle(groups),
    "",
    getMediaTableMarkdown(groups),
    "",
    `<sub>Uploaded with <a href="https://argos-ci.com/docs/learn/media/standalone-media-upload">Argos ↗︎</a>. This comment is updated in place.${versionNote}</sub>`,
  ].join("\n");
}

/**
 * The headline counts the table's rows, not the uploads: a before/after pair is
 * one screenshot to a reviewer, whatever the upload count says. The noun
 * follows the content — "videos" when that is all there is, the generic
 * "media" only for a mix.
 */
function formatCommentTitle(groups: MediaMarkdownGroup[]): string {
  const embeds = groups.flatMap((group) =>
    [group.before, group.after].filter((embed) => embed !== null),
  );
  const noun = embeds.every((embed) => embed.isVideo)
    ? "video"
    : embeds.some((embed) => embed.isVideo)
      ? "media"
      : "screenshot";
  const count = groups.length;
  // "media" is its own plural; the others take an "s" past one.
  const label = noun === "media" || count === 1 ? noun : `${noun}s`;
  return `**${count} ${label} uploaded by Argos**`;
}

type MediaPair = { before: Media | null; after: Media | null };

/**
 * Group a pull request's media so the two halves of a pair land in one row.
 *
 * Keyed on the name, which is what a pair shares. A media with no state is its own
 * group, keyed separately so a standalone `checkout.png` never absorbs a
 * `checkout.png` that is half of a pair.
 */
function groupByPair(media: Media[]): MediaPair[] {
  const groups = new Map<string, MediaPair>();
  for (const item of media) {
    const key = item.state ? `pair:${item.name}` : `solo:${item.id}`;
    const group = groups.get(key) ?? { before: null, after: null };
    if (item.state === "before") {
      group.before = item;
    } else {
      group.after = item;
    }
    groups.set(key, group);
  }
  return [...groups.values()];
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
