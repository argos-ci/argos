import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Media } from "@/database/models";
import { ensureMediaDiff } from "@/media/diff-schedule";
import {
  checkCanViewMedia,
  getMediaPermissions,
  type MediaPermission,
} from "@/media/permissions";
import { queryProjectMedia } from "@/media/query";
import {
  getMediaDiffUrl,
  getMediaEmbedArgs,
  getMediaFileUrl,
  getMediaPosterUrl,
} from "@/media/serve";
import { getMediaMarkdown, getMediaTableMarkdown } from "@/media/url";
import { getLatestMediaVersion } from "@/media/version";
import { getProjectMemberIds } from "@/project/members";

import {
  IMediaDiffStatus,
  IMediaPermission,
  type IResolvers,
} from "../__generated__/resolver-types";
import type { Context } from "../context";

const { gql } = gqlTag;

/**
 * How many of a pull request's media the share page's sidebar lists.
 *
 * The list is not paginated — it is a sidebar the reviewer scrolls — so the cap
 * is what keeps a pull request with hundreds of uploads from being one enormous
 * response. Well above what a pull request realistically carries.
 */
const MAX_PULL_REQUEST_MEDIAS = 100;

/** The service's permission names, as the schema's enum members. */
const GRAPHQL_PERMISSION: Record<MediaPermission, IMediaPermission> = {
  view: IMediaPermission.View,
  comment: IMediaPermission.Comment,
  delete: IMediaPermission.Delete,
};

export const typeDefs = gql`
  enum MediaVisibility {
    "Anyone with the share URL"
    public
    "Team members only"
    team
  }

  enum MediaPermission {
    view
    comment
    delete
  }

  enum MediaState {
    before
    after
  }

  enum MediaDiffStatus {
    "Queued or being computed. Nothing to draw yet."
    pending
    "Computed. \`url\` is the mask, or null when the two halves are identical."
    complete
    "Could not be computed. The pair is still shown, without an overlay."
    error
  }

  """
  The pixel difference between the two halves of a before/after pair, computed
  with the same engine — and therefore the same tolerances — that compares a
  build's screenshots.

  Identified by the two versions it was computed from, so it can never describe
  bytes other than the ones on screen: re-uploading either half makes a new pair
  and a new diff, and until that one is computed there is simply no diff rather
  than a stale one.
  """
  type MediaDiff implements Node {
    id: ID!
    status: MediaDiffStatus!
    """
    CDN URL of the diff mask — a transparent PNG whose opaque pixels are the ones
    that changed, meant to be drawn over the "after".

    Null while the diff is pending, when it failed, and when the two halves are
    identical: there is nothing to mark.
    """
    url: String
    """
    The mask's dimensions — the union of the two halves, since both are padded to
    a common canvas before being compared. Place each half at the top left of a
    frame this size and the mask lines up with them.
    """
    width: Int
    height: Int
    """
    Share of pixels that differ, 0 to 1. Null until the diff has been computed,
    0 when the two halves are identical, and 1 when their layouts differ.
    """
    score: Float
    "The version this was computed from on the \`before\` side"
    beforeVersion: MediaVersion!
    "The version this was computed from on the \`after\` side"
    afterVersion: MediaVersion!
  }

  """
  One upload of a media. Re-uploading the same name adds a version rather than
  overwriting one, so the version a reviewer commented on is still there to
  compare against.
  """
  type MediaVersion implements Node {
    id: ID!
    createdAt: DateTime!
    "1-based, and what the UI calls this version"
    number: Int!
    "CDN URL the bytes are served from"
    fileUrl: String!
    "Poster frame of a video, derived by the image CDN. Null for images."
    posterUrl: String
    contentType: String!
    sizeBytes: Float!
    width: Int
    height: Int
    isVideo: Boolean!
    "When this version is deleted. Counted from its upload."
    expiresAt: DateTime
    "Screenshot units this upload charged"
    billedUnits: Int!
    """
    The comparison this version took part in — the changed pixels between it and
    the other half of its pair.

    On the version rather than on the media because that is what a comparison is
    of: re-uploading either half makes a new pair and a new comparison, and the
    old one still describes the two versions it was computed from. Looking back
    at an older version therefore gets that version's own comparison, and
    \`afterVersion\` / \`beforeVersion\` say which two images it describes — the
    pair to put on screen beside it.

    Null when the media is not half of a visible pair, when the two halves were
    never compared, and when the pair is not two images.
    """
    diff: MediaDiff
  }

  type Media implements Node {
    id: ID!
    createdAt: DateTime!
    """
    The media's name, and its identity within its pull request. Uploading the
    same name again adds a version.
    """
    name: String!
    "Which half of a before/after pair this is, if it is half of one"
    state: MediaState
    "Prose shown under the media in the pull request comment"
    description: String
    "Share page URL, the one to paste into a pull request"
    url: String!
    "The token the share URL carries — the handle that opens this media's page"
    shareToken: String!
    """
    Ready-to-paste Markdown embed, always pointing at the newest version: the
    picture served from the CDN, linked to the share page. Never built from
    \`url\` — that is an HTML page, and an image embed pointing at it renders as
    a broken image.
    """
    markdown: String!
    """
    Ready-to-paste table showing the before/after pair side by side — the same
    rendering the managed pull request comment uses (an HTML table, which
    GitHub-flavored Markdown renders as-is). Null when this media is not half
    of an uploaded pair.
    """
    markdownPair: String
    "The newest uploaded version — what the share page and the comment show"
    latestVersion: MediaVersion!
    "Every uploaded version, newest first"
    versions: [MediaVersion!]!
    """
    The other half of this media's before/after pair, if there is one.

    Matched on the same name and pull request with the opposite state, which is
    what lets the share page show the two together and compare them.
    """
    counterpart: Media
    """
    The pull request this media is published to.

    Null for a viewer without access to the project, whatever the media's own
    visibility — a public share link exists so a reviewer can see the *picture*,
    and the pull request's title, author and number are not part of that.
    """
    pullRequest: PullRequest
    """
    Every media published to the same pull request, this one included, oldest
    first — the order the managed pull request comment lists them in, so the
    share page's sidebar reads like the comment the reviewer arrived from.

    Empty when this media is not published to a pull request. Filtered by what
    the viewer may see: without membership on the project, only the public ones
    — which is what lets a public share link offer the rest of the public set
    without opening the team-only uploads beside it.
    """
    pullRequestMedias: [Media!]!
    visibility: MediaVisibility!
    project: Project
    permissions: [MediaPermission!]!
    """
    Comment threads on this media, oldest first. A comment's \`anchor\` gives the
    point on the image it refers to, which is how a reviewer marks one up.

    Threads belong to the media rather than to a version, so they survive the
    re-upload they asked for; each comment's \`mediaVersion\` says which version
    its author was looking at.
    """
    comments: [Comment!]!
    """
    Users that can be @-mentioned in a comment on this media — the project's
    members. Empty unless the viewer can comment: a public share link must not
    enumerate the team behind it.
    """
    mentionableUsers: [User!]!
    "Open threads on this media — what still needs acting on."
    unresolvedCommentCount: Int!
  }

  extend type Query {
    """
    Look up a media by its share token — the handle a share URL carries.

    Answers for anyone when the media is public, and only for members of the
    owning team otherwise. A media nobody may see is reported as not found rather
    than as forbidden, so a share URL never confirms that it points at something.
    """
    mediaByShareToken(shareToken: String!): Media
  }
`;

export const resolvers: IResolvers = {
  MediaDiff: {
    status: (diff) => {
      switch (diff.jobStatus) {
        case "complete":
          return IMediaDiffStatus.Complete;
        case "error":
        case "aborted":
          return IMediaDiffStatus.Error;
        // "progress" is queued from the reader's point of view: there is still
        // nothing to draw, and a client that distinguished them would only be
        // able to word its spinner differently.
        default:
          return IMediaDiffStatus.Pending;
      }
    },
    url: (diff) => (diff.key ? getMediaDiffUrl(diff.key) : null),
    beforeVersion: async (diff, _args, ctx) => {
      const version = await ctx.loaders.MediaVersion.load(
        diff.beforeMediaVersionId,
      );
      // The columns are `notNullable` foreign keys that cascade on delete, so a
      // diff whose versions are gone is a diff that is gone.
      invariant(version, "diff has no before version");
      return version;
    },
    afterVersion: async (diff, _args, ctx) => {
      const version = await ctx.loaders.MediaVersion.load(
        diff.afterMediaVersionId,
      );
      invariant(version, "diff has no after version");
      return version;
    },
  },
  MediaVersion: {
    fileUrl: (version) => getMediaFileUrl(version),
    posterUrl: (version) => getMediaPosterUrl(version),
    contentType: (version) => version.mimeType,
    sizeBytes: (version) => version.size,
    isVideo: (version) => version.isVideo(),
    diff: async (version, _args, ctx) => {
      const media = await ctx.loaders.Media.load(version.mediaId);
      invariant(media, "version has no media");
      if (!media.state) {
        return null;
      }
      // Gated on the *visible* counterpart, like `markdownPair`: the mask marks
      // pixels of the other half, and a viewer who may not see that half may not
      // see where it changed either.
      const counterpart = await resolveVisibleCounterpart(media, ctx);
      if (!counterpart) {
        return null;
      }
      // Newest first, which is the order this version's comparisons are
      // preferred in below.
      const counterpartVersions = await ctx.loaders.MediaVersions.load(
        counterpart.id,
      );
      const newestCounterpartVersion = counterpartVersions[0];
      if (!newestCounterpartVersion) {
        return null;
      }

      const ownNewest = await ctx.loaders.LatestMediaVersion.load(media.id);
      if (ownNewest?.id === version.id) {
        const [beforeVersion, afterVersion] =
          media.state === "before"
            ? [version, newestCounterpartVersion]
            : [newestCounterpartVersion, version];
        // Scheduling here as well as on upload is what makes the overlay show up
        // for a pair that came together some other way — one half adopted onto a
        // pull request, or a pair that predates the feature. The insert is
        // idempotent, so a pair already computed costs one lookup.
        //
        // Only for the newest version: an older one is history, and asking for
        // a comparison that was never made would queue a job per version the
        // reviewer clicks through.
        return ensureMediaDiff({ beforeVersion, afterVersion });
      }

      const ownSide =
        media.state === "before"
          ? "beforeMediaVersionId"
          : "afterMediaVersionId";
      const counterpartSide =
        media.state === "before"
          ? "afterMediaVersionId"
          : "beforeMediaVersionId";
      const diffs = await ctx.loaders.MediaVersionDiffs.load(version.id);
      const byCounterpartVersion = new Map(
        diffs
          .filter((diff) => diff[ownSide] === version.id)
          .map((diff) => [diff[counterpartSide], diff]),
      );
      // While this version was the newest of its half, every re-upload of the
      // other half made another comparison against it — so it can sit in
      // several. The newest of them is the one to show, because it is the half
      // the page puts beside it.
      for (const counterpartVersion of counterpartVersions) {
        const diff = byCounterpartVersion.get(counterpartVersion.id);
        if (diff) {
          return diff;
        }
      }
      return null;
    },
  },
  Media: {
    url: (media) => media.url,
    shareToken: (media) => media.shareToken,
    latestVersion: async (media, _args, ctx) => {
      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      // `mediaByShareToken` refuses a media with no uploaded version, and nothing
      // else exposes one, so reaching here means those two disagree.
      invariant(version, "media has no uploaded version");
      return version;
    },
    versions: async (media, _args, ctx) => {
      return ctx.loaders.MediaVersions.load(media.id);
    },
    counterpart: async (media, _args, ctx) => {
      if (!media.state) {
        return null;
      }
      return resolveVisibleCounterpart(media, ctx);
    },
    pullRequest: async (media, _args, ctx) => {
      if (!media.githubPullRequestId) {
        return null;
      }
      // Project membership, not the media's visibility and not merely being
      // signed in: a stranger with an account is still a stranger. The media
      // being `public` says the picture may be shown, not that the work around
      // it may be.
      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project,
          user: ctx.auth?.user ?? null,
        });
      if (!membershipPermissions.includes("view")) {
        return null;
      }
      return ctx.loaders.GithubPullRequest.load(media.githubPullRequestId);
    },
    pullRequestMedias: async (media, _args, ctx) => {
      if (!media.githubPullRequestId) {
        return [];
      }
      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project,
          user: ctx.auth?.user ?? null,
        });
      // Scoped to this media's own project: a pull request can carry media from
      // several projects, and access is decided per project.
      const query = queryProjectMedia({
        projectIds: [media.projectId],
        filters: { githubPullRequestId: media.githubPullRequestId },
        order: "asc",
      }).limit(MAX_PULL_REQUEST_MEDIAS);
      if (!membershipPermissions.includes("view")) {
        // The per-item form of `checkCanViewMedia`, for the same reason
        // `resolveVisibleCounterpart` re-checks: the halves of a pair are
        // separate uploads with their own visibility, so a public link must not
        // list the team-only media published beside it.
        query.where("media.visibility", "public");
      }
      // Expiry is not filtered here, matching the REST list: a version can
      // expire between this query and the click, and the share page already has
      // one state for a media that is no longer there.
      return query;
    },
    markdown: async (media, _args, ctx) => {
      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      invariant(version, "media has no uploaded version");
      return getMediaMarkdown(
        getMediaEmbedArgs({ name: media.name, shareUrl: media.url, version }),
      );
    },
    markdownPair: async (media, _args, ctx) => {
      // The pair's side-by-side table — the exact rendering the managed pull
      // request comment uses — so pasting it by hand shows before and after
      // together, like the page does.
      const counterpart = media.state
        ? await resolveVisibleCounterpart(media, ctx)
        : null;
      const counterpartVersion = counterpart
        ? await ctx.loaders.LatestMediaVersion.load(counterpart.id)
        : null;
      if (!counterpart || !counterpartVersion) {
        return null;
      }

      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      invariant(version, "media has no uploaded version");
      const embed = getMediaEmbedArgs({
        name: media.name,
        shareUrl: media.url,
        version,
      });
      const counterpartEmbed = getMediaEmbedArgs({
        name: counterpart.name,
        shareUrl: counterpart.url,
        version: counterpartVersion,
      });
      const [beforeMedia, afterMedia] =
        media.state === "before" ? [media, counterpart] : [counterpart, media];
      const [before, after] =
        media.state === "before"
          ? [embed, counterpartEmbed]
          : [counterpartEmbed, embed];
      return getMediaTableMarkdown([
        {
          name: media.name,
          // The description belongs to the pair, not to either half.
          description:
            afterMedia.description ?? beforeMedia.description ?? null,
          before,
          after,
        },
      ]);
    },
    project: async (media, _args, ctx) => {
      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      // A public share page is opened by people with no Argos account, and the
      // project's name can itself be unreleased information. Only viewers who
      // could reach the project anyway get it as context.
      const permissions = await project.$getPermissions(ctx.auth?.user ?? null);
      return permissions.includes("view") ? project : null;
    },
    comments: async (media, _args, ctx) => {
      return ctx.loaders.MediaComments.load({
        mediaId: media.id,
        viewerUserId: ctx.auth?.user.id ?? null,
      });
    },
    mentionableUsers: async (media, _args, ctx) => {
      if (!ctx.auth) {
        return [];
      }
      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project,
          user: ctx.auth.user,
        });
      const permissions = getMediaPermissions({
        visibility: media.visibility,
        membershipPermissions,
      });
      if (!permissions.includes("comment")) {
        return [];
      }
      const userIds = await getProjectMemberIds(project);
      const accounts = await Promise.all(
        userIds.map((userId) =>
          ctx.loaders.AccountFromRelation.load({ userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
    },
    unresolvedCommentCount: async (media, _args, ctx) => {
      const comments = await ctx.loaders.MediaComments.load({
        mediaId: media.id,
        viewerUserId: ctx.auth?.user.id ?? null,
      });
      // Resolution lives on a thread's root, so only roots are counted — a reply
      // is part of its thread, not a second thing to deal with.
      return comments.filter(
        (comment) => !comment.threadId && !comment.resolvedAt,
      ).length;
    },
    permissions: async (media, _args, ctx) => {
      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project,
          user: ctx.auth?.user ?? null,
        });
      return getMediaPermissions({
        visibility: media.visibility,
        membershipPermissions,
      }).map((permission) => GRAPHQL_PERMISSION[permission]);
    },
  },
  Query: {
    mediaByShareToken: async (_root, args, ctx) => {
      const media = await Media.query().findOne({
        shareToken: args.shareToken,
      });

      if (!media) {
        return null;
      }

      // Not found, expired and not-yet-uploaded all answer the same way: the
      // share page renders one "this link is no longer available" state, and
      // telling them apart would leak whether a token was ever valid. Expiry is
      // per version, so a media with nothing left unexpired reads as gone.
      const latest = await getLatestMediaVersion(media.id);
      if (!latest || latest.isExpired()) {
        return null;
      }

      // Public media needs no session at all, which is the point: a reviewer with
      // no Argos account has to be able to open it.
      if (media.visibility === "public") {
        return media;
      }

      const project = await ctx.loaders.Project.load(media.projectId);
      invariant(project, "project not found");
      // Membership permissions, not `$getPermissions`: a public project grants
      // anyone "view", which must not open its team-only media to the world.
      const membershipPermissions =
        await ctx.loaders.ProjectMembershipPermissions.load({
          project,
          user: ctx.auth?.user ?? null,
        });

      return checkCanViewMedia({
        visibility: media.visibility,
        membershipPermissions,
      })
        ? media
        : null;
    },
  },
};

/**
 * The other half of a pair, but only if this viewer may see *it*.
 *
 * The two halves carry their own `visibility` — they are two `POST /media` calls
 * — so a pair can be mixed, and on a paid plan the default is `team`. Returning
 * the counterpart unchecked let a `public` share link hand out the `team` half in
 * full: its name, description, share token, review threads, and a
 * `latestVersion.fileUrl` that is an unauthenticated CDN URL, which is the bytes
 * themselves. The share page's own query selects exactly those fields, so no
 * crafted request was needed.
 *
 * Same rule the media's own `permissions` field already applied to itself — it
 * was the one thing on the object not applied to the counterpart.
 */
async function resolveVisibleCounterpart(
  media: Media,
  ctx: Context,
): Promise<Media | null> {
  const counterpart = await ctx.loaders.MediaCounterpart.load(media.id);
  if (!counterpart) {
    return null;
  }
  const project = await ctx.loaders.Project.load(counterpart.projectId);
  invariant(project, "project not found");
  // Through the loader because this is now reached once per version, and the
  // answer cannot differ between the versions of one media.
  const membershipPermissions =
    await ctx.loaders.ProjectMembershipPermissions.load({
      project,
      user: ctx.auth?.user ?? null,
    });
  return checkCanViewMedia({
    visibility: counterpart.visibility,
    membershipPermissions,
  })
    ? counterpart
    : null;
}
