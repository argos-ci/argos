import { MediaContentTypeSchema } from "@argos/schemas/media";
import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Media } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { createMedia } from "@/media/create";
import { finalizeMedia } from "@/media/finalize";
import { deleteUnreferencedMediaObjects } from "@/media/object";
import {
  checkCanViewMedia,
  getMediaPermissions,
  type MediaPermission,
} from "@/media/permissions";
import { updatePullRequestComment } from "@/media/pull-request-comment";
import { getMediaFileUrl, getMediaPosterUrl } from "@/media/serve";
import { getMediaMarkdown } from "@/media/url";
import { SHA256_REGEX } from "@/util/validation";

import {
  IMediaPermission,
  IMediaStatus,
  type IResolvers,
} from "../__generated__/resolver-types";
import { getAdminAccount } from "../services/account";
import {
  badUserInput,
  forbidden,
  invalidId,
  notFound,
  toGraphQLError,
  unauthenticated,
} from "../util";

const { gql } = gqlTag;

/** The service's permission names, as the schema's enum members. */
const GRAPHQL_PERMISSION: Record<MediaPermission, IMediaPermission> = {
  view: IMediaPermission.View,
  delete: IMediaPermission.Delete,
};

export const typeDefs = gql`
  enum MediaVisibility {
    "Anyone with the share URL"
    public
    "Team members only"
    team
  }

  enum MediaStatus {
    "Registered, waiting for its bytes"
    pending
    "Bytes uploaded and checked; fully usable"
    ready
  }

  enum MediaPermission {
    view
    delete
  }

  type Media implements Node {
    id: ID!
    createdAt: DateTime!
    "Original file name"
    name: String!
    "Stable per-team identifier; re-uploading it replaces the file in place"
    slug: String
    "Share page URL, the one to paste into a pull request"
    url: String!
    "Ready-to-paste Markdown embed"
    markdown: String!
    "CDN URL the bytes are served from"
    fileUrl: String!
    "Poster frame of a video, derived by the image CDN. Null for images."
    posterUrl: String
    contentType: String!
    sizeBytes: Float!
    width: Int
    height: Int
    isVideo: Boolean!
    visibility: MediaVisibility!
    status: MediaStatus!
    "When the media is deleted. Counted from the upload."
    expiresAt: DateTime
    "Screenshot units this upload charged"
    billedUnits: Int!
    project: Project
    permissions: [MediaPermission!]!
  }

  type MediaConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Media!]!
  }

  input MediaFilterInput {
    "Match media on their file name or slug"
    search: String
    "Restrict to images or to videos"
    type: MediaType
  }

  enum MediaType {
    image
    video
  }

  input DeleteMediaInput {
    id: ID!
  }

  input CreateMediaInput {
    accountId: ID!
    "File name"
    name: String!
    contentType: String!
    "File size in bytes"
    size: Int!
    "SHA-256 of the file contents, hex encoded"
    hash: String!
    visibility: MediaVisibility
  }

  """
  Where to send a file's bytes: POST it to \`url\` as multipart form data, with
  every entry of \`fields\` appended before the \`file\` part.
  """
  type MediaUploadTarget {
    url: String!
    fields: JSONObject!
  }

  type CreateMediaPayload {
    media: Media!
    "Null when Argos already holds this exact file and nothing needs uploading"
    upload: MediaUploadTarget
  }

  input FinalizeMediaInput {
    id: ID!
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

  extend type Mutation {
    """
    Register a media and get a signed target to upload its bytes to.

    The browser uploads straight to storage rather than through Argos: a 500 MB
    screen recording has no business passing through a GraphQL request.
    """
    createMedia(input: CreateMediaInput!): CreateMediaPayload!
    "Confirm a media's bytes have been uploaded, making it viewable"
    finalizeMedia(input: FinalizeMediaInput!): Media!
    "Delete a media and the files behind it"
    deleteMedia(input: DeleteMediaInput!): Boolean!
  }
`;

export const resolvers: IResolvers = {
  Media: {
    url: (media) => media.url,
    fileUrl: (media) => getMediaFileUrl(media),
    posterUrl: (media) => getMediaPosterUrl(media),
    contentType: (media) => media.mimeType,
    sizeBytes: (media) => media.size,
    isVideo: (media) => media.isVideo(),
    markdown: (media) =>
      getMediaMarkdown({
        name: media.name,
        shareUrl: media.url,
        posterUrl: getMediaPosterUrl(media),
        isVideo: media.isVideo(),
      }),
    status: (media) =>
      media.uploadedAt ? IMediaStatus.Ready : IMediaStatus.Pending,
    project: async (media, _args, ctx) => {
      if (!media.projectId) {
        return null;
      }
      return ctx.loaders.Project.load(media.projectId);
    },
    permissions: async (media, _args, ctx) => {
      const account = await ctx.loaders.Account.load(media.accountId);
      invariant(account, "account not found");
      const accountPermissions = await account.$getPermissions(
        ctx.auth?.user ?? null,
      );
      return getMediaPermissions(accountPermissions).map(
        (permission) => GRAPHQL_PERMISSION[permission],
      );
    },
  },
  Query: {
    mediaByShareToken: async (_root, args, ctx) => {
      const media = await Media.query().findOne({
        shareToken: args.shareToken,
      });

      // Not found, expired and not-yet-uploaded all answer the same way: the
      // share page renders one "this link is no longer available" state, and
      // telling them apart would leak whether a token was ever valid.
      if (!media || media.isExpired() || !media.uploadedAt) {
        return null;
      }

      // Public media needs no session at all, which is the point: a reviewer with
      // no Argos account has to be able to open it.
      if (media.visibility === "public") {
        return media;
      }

      const account = await ctx.loaders.Account.load(media.accountId);
      invariant(account, "account not found");
      const accountPermissions = await account.$getPermissions(
        ctx.auth?.user ?? null,
      );

      return checkCanViewMedia({
        visibility: media.visibility,
        accountPermissions,
      })
        ? media
        : null;
    },
  },
  Mutation: {
    createMedia: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      const { input } = args;

      // Uploading from the app is an admin action, same as browsing the library:
      // it spends the team's screenshot quota and publishes a link under its name.
      const account = await getAdminAccount({
        id: input.accountId,
        user: ctx.auth.user,
      });

      const contentType = MediaContentTypeSchema.safeParse(input.contentType);
      if (!contentType.success) {
        throw badUserInput(
          contentType.error.issues[0]?.message ?? "Unsupported file type.",
          { field: "contentType" },
        );
      }

      if (!SHA256_REGEX.test(input.hash)) {
        throw badUserInput("Invalid file hash.", { field: "hash" });
      }

      try {
        const result = await createMedia({
          account,
          project: null,
          userId: ctx.auth.user.id,
          name: input.name,
          contentType: contentType.data,
          sizeBytes: input.size,
          hash: input.hash,
          slug: null,
          visibility: input.visibility ?? null,
          retentionDays: null,
        });
        return result;
      } catch (error) {
        // The service throws HTTP errors (plan limits, file too large); surface
        // them as GraphQL errors the form can display rather than as crashes.
        throw toGraphQLError(error);
      }
    },
    finalizeMedia: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      if (!isValidPgBigInt(args.input.id)) {
        throw invalidId();
      }

      const media = await Media.query().findById(args.input.id);
      if (!media) {
        throw notFound("Media not found.");
      }

      await getAdminAccount({
        id: media.accountId,
        user: ctx.auth.user,
      });

      try {
        return await finalizeMedia(media);
      } catch (error) {
        throw toGraphQLError(error);
      }
    },
    deleteMedia: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }
      if (!isValidPgBigInt(args.input.id)) {
        throw invalidId();
      }

      const media = await Media.query().findById(args.input.id);
      if (!media) {
        throw notFound("Media not found.");
      }

      const account = await ctx.loaders.Account.load(media.accountId);
      invariant(account, "account not found");
      const accountPermissions = await account.$getPermissions(ctx.auth.user);
      if (!getMediaPermissions(accountPermissions).includes("delete")) {
        throw forbidden("You are not an administrator of this team.");
      }

      // Objects first: a row deleted while its bytes survive leaves storage
      // nothing references, and no later pass would find it. Keys another media
      // still points at are kept — the same file uploaded twice shares one.
      await deleteUnreferencedMediaObjects({
        keys: [media.key],
        excludeMediaIds: [media.id],
      });
      await media.$query().delete();

      if (media.githubPullRequestId) {
        await updatePullRequestComment(media.githubPullRequestId);
      }

      return true;
    },
  },
};
