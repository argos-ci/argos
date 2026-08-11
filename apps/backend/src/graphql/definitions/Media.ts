import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Media } from "@/database/models";
import {
  checkCanViewMedia,
  getMediaPermissions,
  type MediaPermission,
} from "@/media/permissions";
import {
  getMediaEmbedArgs,
  getMediaFileUrl,
  getMediaPosterUrl,
} from "@/media/serve";
import { getMediaBlockMarkdown, getMediaMarkdown } from "@/media/url";
import { getLatestMediaVersion } from "@/media/version";
import { getProjectMemberIds } from "@/project/members";

import {
  IMediaPermission,
  type IResolvers,
} from "../__generated__/resolver-types";
import type { Context } from "../context";

const { gql } = gqlTag;

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
    """
    Ready-to-paste Markdown embed, always pointing at the newest version: the
    picture served from the CDN, linked to the share page. Never built from
    \`url\` — that is an HTML page, and an image embed pointing at it renders as
    a broken image.
    """
    markdown: String!
    """
    Ready-to-paste Markdown block showing the before/after pair side by side under
    its name and description — the same rendering the managed pull request comment
    uses. Null when this media is not half of an uploaded pair.
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
  MediaVersion: {
    fileUrl: (version) => getMediaFileUrl(version),
    posterUrl: (version) => getMediaPosterUrl(version),
    contentType: (version) => version.mimeType,
    sizeBytes: (version) => version.size,
    isVideo: (version) => version.isVideo(),
  },
  Media: {
    url: (media) => media.url,
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
      const membershipPermissions = await project.$getMembershipPermissions(
        ctx.auth?.user ?? null,
      );
      if (!membershipPermissions.includes("view")) {
        return null;
      }
      return ctx.loaders.GithubPullRequest.load(media.githubPullRequestId);
    },
    markdown: async (media, _args, ctx) => {
      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      invariant(version, "media has no uploaded version");
      return getMediaMarkdown(
        getMediaEmbedArgs({ name: media.name, shareUrl: media.url, version }),
      );
    },
    markdownPair: async (media, _args, ctx) => {
      // The pair's side-by-side block — the exact rendering the managed pull
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
      const afterVersion =
        media.state === "before" ? counterpartVersion : version;
      return getMediaBlockMarkdown({
        name: media.name,
        // The description belongs to the pair, not to either half.
        description: afterMedia.description ?? beforeMedia.description ?? null,
        // The badges describe the half on show, which for a pair is the after.
        versionNumber: afterVersion.number,
        teamOnly: afterMedia.visibility !== "public",
        before,
        after,
      });
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
      const membershipPermissions = await project.$getMembershipPermissions(
        ctx.auth.user,
      );
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
      const membershipPermissions = await project.$getMembershipPermissions(
        ctx.auth?.user ?? null,
      );
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
      const membershipPermissions = await project.$getMembershipPermissions(
        ctx.auth?.user ?? null,
      );

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
  const membershipPermissions = await project.$getMembershipPermissions(
    ctx.auth?.user ?? null,
  );
  return checkCanViewMedia({
    visibility: counterpart.visibility,
    membershipPermissions,
  })
    ? counterpart
    : null;
}
