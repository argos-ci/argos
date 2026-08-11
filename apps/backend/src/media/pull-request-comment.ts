import { invariant } from "@argos/util/invariant";
import type { Octokit } from "@octokit/rest";

import {
  GithubPullRequest,
  GithubRepository,
  Media,
  MediaVersion,
  Project,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import logger from "@/logger";
import { redisLock } from "@/util/redis";

import { uploadedVersions } from "./query";
import { getMediaEmbedArgs } from "./serve";
import {
  getMediaListMarkdown,
  type MediaEmbedArgs,
  type MediaMarkdownGroup,
} from "./url";
import { getLatestMediaVersions } from "./version";

/** How many media the comment lists before it stops growing. */
const MAX_LISTED_MEDIA = 20;

const expiryFormatter = Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** Every media this pull request should currently be showing. */
function pullRequestMediaQuery(githubPullRequestId: string) {
  return (
    Media.query()
      .where("githubPullRequestId", githubPullRequestId)
      .whereExists(uploadedVersions())
      // The setting the build and deployment paths both honour, and the media
      // path did not: an owner who turned Argos pull request comments off was
      // still getting them. Per project, because one pull request can carry media
      // from several — the ones that opted out drop out of the list rather than
      // suppressing the whole comment.
      .whereExists(
        Project.query()
          .select(1)
          .whereColumn("projects.id", "media.projectId")
          .where("projects.prCommentEnabled", true),
      )
  );
}

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

  // Newest first to decide what the cap keeps, then reversed for display. Taking
  // the oldest would drop precisely the media the pull request is being updated
  // for — the one just uploaded — while keeping twenty stale ones.
  const [total, newestFirst] = await Promise.all([
    pullRequestMediaQuery(githubPullRequestId).resultSize(),
    pullRequestMediaQuery(githubPullRequestId)
      .orderBy("createdAt", "desc")
      // Same-timestamp uploads would otherwise sort arbitrarily, and the cap
      // would keep a different subset on every rebuild.
      .orderBy("id", "desc")
      .limit(MAX_LISTED_MEDIA),
  ]);

  if (newestFirst.length === 0) {
    return;
  }

  const media = newestFirst.toReversed();

  // The comment always shows the newest upload of each media, which is what makes
  // re-uploading after a review update the pull request without touching it.
  const latestVersions = await getLatestMediaVersions(
    media.map((item) => item.id),
  );

  const body = buildCommentBody(media, latestVersions, { total });

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
 * A before/after pair shares a name, so the two are shown side by side — which is
 * the whole reason `state` exists, and reads far better than two unrelated blocks
 * a reviewer has to match up themselves.
 *
 * Every picture is a CDN file linked to its share page; {@link getMediaMarkdown}
 * owns why it is built that way.
 */
export function buildCommentBody(
  media: Media[],
  latestVersions: Map<string, MediaVersion>,
  args: { total: number },
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
    const before = embed(group.before);
    const after = embed(group.after);
    if (!before && !after) {
      return [];
    }
    // The half whose bytes are on show — the one the badges have to describe.
    const item = after ? group.after : group.before;
    invariant(item, "an embedded group has the media it was embedded from");
    const version = latestVersions.get(item.id);
    invariant(version, "an embedded media has an uploaded version");
    return [
      {
        name: item.name,
        // The description belongs to the pair, not to either half.
        description:
          group.after?.description ?? group.before?.description ?? null,
        versionNumber: version.number,
        teamOnly: item.visibility !== "public",
        before,
        after,
      },
    ];
  });

  // Stated rather than left to be discovered: the media outlive neither the pull
  // request nor the comment, so a reader coming back to a merged pull request
  // months later would otherwise find dead pictures and no explanation.
  const expiresAt = getEarliestExpiry(media, latestVersions);
  const expiryNote = expiresAt
    ? ` Media expire on ${expiryFormatter.format(expiresAt)}.`
    : "";

  return [
    `**${getUploadCount(groups)} uploaded by Argos**`,
    "",
    getMediaListMarkdown(groups),
    "",
    // A truncated list that does not say so reads as a complete one, which is
    // worse than the truncation.
    ...(args.total > media.length
      ? [`Showing the ${media.length} most recent of ${args.total} media.`, ""]
      : []),
    `<sub>Uploaded with [Argos ↗︎](https://argos-ci.com/docs/learn/media/standalone-media-upload). This comment is updated in place.${expiryNote}</sub>`,
  ].join("\n");
}

/**
 * What the comment is showing, counted by kind — "3 screenshots", "2 screenshots
 * and 1 recording".
 *
 * The first line of a comment is the only part that survives into an email
 * notification and into the collapsed view of a long thread, so spending it on a
 * label that says nothing wastes the one place a reader is guaranteed to look.
 */
function getUploadCount(groups: MediaMarkdownGroup[]): string {
  const recordings = groups.filter(
    (group) => (group.after ?? group.before)?.isVideo,
  ).length;
  const screenshots = groups.length - recordings;
  return [
    ...(screenshots > 0 ? [pluralize(screenshots, "screenshot")] : []),
    ...(recordings > 0 ? [pluralize(recordings, "recording")] : []),
  ].join(" and ");
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count > 1 ? "s" : ""}`;
}

/**
 * When the first of the listed media stops resolving.
 *
 * The earliest of them, because that is the date the comment starts being wrong:
 * retention is stamped per version at upload, so a comment holding uploads from
 * different weeks has its pictures die one by one.
 */
function getEarliestExpiry(
  media: Media[],
  latestVersions: Map<string, MediaVersion>,
): Date | null {
  const dates = media.flatMap((item) => {
    const expiresAt = latestVersions.get(item.id)?.expiresAt;
    return expiresAt ? [new Date(expiresAt)] : [];
  });
  if (dates.length === 0) {
    return null;
  }
  return dates.reduce((earliest, date) => (date < earliest ? date : earliest));
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
