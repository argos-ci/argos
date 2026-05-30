import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";
import gqlTag from "graphql-tag";

import { addCommentReaction } from "@/comment/addCommentReaction";
import { createBuildComment } from "@/comment/createBuildComment";
import { deleteBuildComment } from "@/comment/deleteBuildComment";
import { formatCommentId, parseCommentId } from "@/comment/id";
import { getCommentPermissions } from "@/comment/permissions";
import { groupCommentReactions } from "@/comment/reactions";
import { removeCommentReaction } from "@/comment/removeCommentReaction";
import { updateBuildComment } from "@/comment/updateBuildComment";
import { Build } from "@/database/models/Build";
import { Comment } from "@/database/models/Comment";
import type { User } from "@/database/models/User";

import type {
  ICommentPermission,
  IResolvers,
} from "../__generated__/resolver-types";
import { forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

/**
 * Resolve a comment from its public GraphQL ID. Malformed IDs and missing
 * comments both surface as a clean "not found" error rather than an untyped
 * 500.
 */
async function getCommentByGraphqlId(id: string): Promise<Comment> {
  let commentId: string;
  try {
    commentId = parseCommentId(id);
  } catch {
    throw notFound("Comment not found");
  }
  const comment = await Comment.query().findById(commentId);
  if (!comment) {
    throw notFound("Comment not found");
  }
  return comment;
}

/**
 * Ensure the user is allowed to react to a comment. Reacting requires the same
 * "review" permission on the build's project as posting a comment does.
 */
async function checkCanReactToComment(
  comment: Comment,
  user: User,
): Promise<void> {
  const build = await comment
    .$relatedQuery("build")
    .withGraphFetched("project.account");
  invariant(build?.project?.account, "Build project account not found");
  const permissions = await build.project.$getPermissions(user);
  if (!permissions.includes("review")) {
    throw forbidden("You cannot react to this comment");
  }
}

export const typeDefs = gql`
  enum CommentPermission {
    edit
    delete
  }

  """
  Reactions of a single emoji on a comment.
  """
  type CommentReactionGroup {
    "The emoji used for the reaction"
    emoji: String!
    "Number of users who reacted with this emoji"
    count: Int!
    "Whether the current user reacted with this emoji"
    reactedByMe: Boolean!
    "Users who reacted with this emoji"
    users: [User!]!
  }

  """
  A comment posted on a build.
  """
  type Comment implements Node {
    id: ID!
    "Date the comment was posted"
    date: DateTime!
    "Date the comment was last edited, null if never edited"
    editedAt: DateTime
    "Rich-text JSON content of the comment"
    content: JSONObject!
    "Author of the comment"
    user: User
    "Permissions of the current user on this comment"
    permissions: [CommentPermission!]!
    "Emoji reactions on the comment, grouped by emoji"
    reactions: [CommentReactionGroup!]!
  }

  input AddBuildCommentInput {
    buildId: ID!
    "Rich-text JSON content of the comment"
    body: JSONObject!
  }

  input UpdateCommentInput {
    id: ID!
    "Rich-text JSON content of the comment"
    body: JSONObject!
  }

  input DeleteCommentInput {
    id: ID!
  }

  input CommentReactionInput {
    commentId: ID!
    "The emoji to react with"
    emoji: String!
  }

  extend type Mutation {
    "Post a comment on a build"
    addBuildComment(input: AddBuildCommentInput!): Build!
    "Update an existing comment"
    updateComment(input: UpdateCommentInput!): Comment!
    "Delete an existing comment"
    deleteComment(input: DeleteCommentInput!): Comment!
    "Add an emoji reaction to a comment"
    addCommentReaction(input: CommentReactionInput!): Comment!
    "Remove an emoji reaction from a comment"
    removeCommentReaction(input: CommentReactionInput!): Comment!
  }
`;

export const resolvers: IResolvers = {
  Comment: {
    id: (comment) => formatCommentId(comment.id),
    date: (comment) => {
      return new Date(comment.createdAt);
    },
    editedAt: (comment) => {
      return comment.editedAt ? new Date(comment.editedAt) : null;
    },
    content: (comment) => {
      return comment.content as Record<string, unknown>;
    },
    user: async (comment, _, ctx) => {
      if (!comment.userId) {
        return null;
      }
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: comment.userId,
      });
      invariant(account, "Account not found");
      return account;
    },
    permissions: (comment, _args, ctx) => {
      return getCommentPermissions(
        comment,
        ctx.auth?.user ?? null,
      ) as ICommentPermission[];
    },
    reactions: async (comment, _args, ctx) => {
      const reactions = await ctx.loaders.CommentReactions.load(comment.id);
      return groupCommentReactions(reactions);
    },
  },
  CommentReactionGroup: {
    count: (group) => group.userIds.length,
    reactedByMe: (group, _args, ctx) => {
      const userId = ctx.auth?.user.id;
      return userId ? group.userIds.includes(userId) : false;
    },
    users: async (group, _args, ctx) => {
      const accounts = await Promise.all(
        group.userIds.map((userId) =>
          ctx.loaders.AccountFromRelation.load({ userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
    },
  },
  Mutation: {
    addBuildComment: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const build = await Build.query()
        .findById(input.buildId)
        .withGraphFetched("project.account");

      if (!build) {
        throw notFound("Build not found");
      }

      invariant(build.project?.account);

      const permissions = await build.project.$getPermissions(auth.user);

      if (!permissions.includes("review")) {
        throw forbidden("You cannot comment on this build");
      }

      await createBuildComment({
        build,
        userId: auth.user.id,
        body: input.body as JSONContent,
      });

      return build;
    },
    updateComment: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const comment = await getCommentByGraphqlId(input.id);

      const permissions = getCommentPermissions(comment, auth.user);

      if (!permissions.includes("edit")) {
        throw forbidden("You cannot edit this comment");
      }

      return updateBuildComment({
        comment,
        body: input.body as JSONContent,
      });
    },
    deleteComment: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const comment = await getCommentByGraphqlId(input.id);

      const permissions = getCommentPermissions(comment, auth.user);

      if (!permissions.includes("delete")) {
        throw forbidden("You cannot delete this comment");
      }

      return deleteBuildComment({ comment });
    },
    addCommentReaction: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const comment = await getCommentByGraphqlId(input.commentId);

      await checkCanReactToComment(comment, auth.user);

      return addCommentReaction({
        comment,
        userId: auth.user.id,
        emoji: input.emoji,
      });
    },
    removeCommentReaction: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }

      const { input } = args;

      const comment = await getCommentByGraphqlId(input.commentId);

      await checkCanReactToComment(comment, auth.user);

      return removeCommentReaction({
        comment,
        userId: auth.user.id,
        emoji: input.emoji,
      });
    },
  },
};
