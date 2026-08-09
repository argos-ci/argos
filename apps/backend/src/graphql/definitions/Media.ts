import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Media } from "@/database/models";
import {
  checkCanViewMedia,
  getMediaPermissions,
  type MediaPermission,
} from "@/media/permissions";
import { getMediaFileUrl, getMediaPosterUrl } from "@/media/serve";
import { getMediaMarkdown, getMediaTableMarkdown } from "@/media/url";
import { getLatestMediaVersion } from "@/media/version";
import { getProjectMemberIds } from "@/project/members";

import {
  IMediaPermission,
  type IResolvers,
} from "../__generated__/resolver-types";

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
    "Ready-to-paste Markdown embed, always pointing at the newest version"
    markdown: String!
    """
    Ready-to-paste Markdown table showing the before/after pair side by side —
    the same rendering the managed pull request comment uses. Null when this
    media is not half of an uploaded pair.
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
      return ctx.loaders.MediaCounterpart.load(media.id);
    },
    markdown: async (media, _args, ctx) => {
      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      invariant(version, "media has no uploaded version");
      return getMediaMarkdown({
        name: media.name,
        shareUrl: media.url,
        posterUrl: getMediaPosterUrl(version),
        isVideo: version.isVideo(),
      });
    },
    markdownPair: async (media, _args, ctx) => {
      // The pair's side-by-side table — the exact rendering the managed pull
      // request comment uses — so pasting it by hand shows before and after
      // together, like the page does.
      const counterpart = media.state
        ? await ctx.loaders.MediaCounterpart.load(media.id)
        : null;
      const counterpartVersion = counterpart
        ? await ctx.loaders.LatestMediaVersion.load(counterpart.id)
        : null;
      if (!counterpart || !counterpartVersion) {
        return null;
      }

      const version = await ctx.loaders.LatestMediaVersion.load(media.id);
      invariant(version, "media has no uploaded version");
      const embed = {
        name: media.name,
        shareUrl: media.url,
        posterUrl: getMediaPosterUrl(version),
        isVideo: version.isVideo(),
      };
      const counterpartEmbed = {
        name: counterpart.name,
        shareUrl: counterpart.url,
        posterUrl: getMediaPosterUrl(counterpartVersion),
        isVideo: counterpartVersion.isVideo(),
      };
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
