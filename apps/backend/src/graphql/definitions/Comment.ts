import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";
import gqlTag from "graphql-tag";

import { createBuildComment } from "@/comment/createBuildComment";
import { deleteBuildComment } from "@/comment/deleteBuildComment";
import { formatCommentId, parseCommentId } from "@/comment/id";
import { getCommentPermissions } from "@/comment/permissions";
import { updateBuildComment } from "@/comment/updateBuildComment";
import { Build } from "@/database/models/Build";
import { Comment } from "@/database/models/Comment";

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

export const typeDefs = gql`
  enum CommentPermission {
    edit
    delete
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

  extend type Mutation {
    "Post a comment on a build"
    addBuildComment(input: AddBuildCommentInput!): Build!
    "Update an existing comment"
    updateComment(input: UpdateCommentInput!): Comment!
    "Delete an existing comment"
    deleteComment(input: DeleteCommentInput!): Comment!
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
  },
};
