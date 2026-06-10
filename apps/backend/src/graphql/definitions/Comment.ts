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
import {
  resolveCommentThread,
  unresolveCommentThread,
} from "@/comment/resolveCommentThread";
import { updateBuildComment } from "@/comment/updateBuildComment";
import { Build } from "@/database/models/Build";
import { Comment } from "@/database/models/Comment";
import { CommentNotificationSubscription } from "@/database/models/CommentNotificationSubscription";
import type { User } from "@/database/models/User";
import {
  subscribeUserToCommentThread,
  unsubscribeUserFromCommentThread,
} from "@/database/services/comment-notification-subscription";

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
async function assertCanReactToComment(
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

async function getCommentThreadByGraphqlId(id: string): Promise<Comment> {
  const comment = await getCommentByGraphqlId(id);
  if (comment.deletedAt) {
    throw notFound("Thread not found");
  }
  const threadId = comment.threadId ?? comment.id;
  const thread =
    threadId === comment.id
      ? comment
      : await Comment.query().findById(threadId);
  if (!thread || thread.deletedAt) {
    throw notFound("Thread not found");
  }
  return thread;
}

async function assertCanAccessCommentThread(input: {
  thread: Comment;
  user: User;
  permission: "view" | "review";
}): Promise<void> {
  const { thread, user, permission } = input;
  const build = await thread
    .$relatedQuery("build")
    .withGraphFetched("project.account");
  invariant(build?.project?.account, "Build project account not found");
  const permissions = await build.project.$getPermissions(user);
  if (!permissions.includes(permission)) {
    throw forbidden("You cannot access this thread");
  }
}

async function getCommentThreadForUser(input: {
  id: string;
  user: User;
  permission: "view" | "review";
  buildId?: string;
}): Promise<Comment> {
  const thread = await getCommentThreadByGraphqlId(input.id);
  if (input.buildId && thread.buildId !== input.buildId) {
    throw notFound("Thread not found");
  }
  await assertCanAccessCommentThread({
    thread,
    user: input.user,
    permission: input.permission,
  });
  return thread;
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
    "Date the thread was resolved, null if not resolved. Only set on a root comment."
    resolvedAt: DateTime
    "Rich-text JSON content of the comment"
    content: JSONObject!
    "Author of the comment"
    user: User
    "Users mentioned in the comment"
    mentionedUsers: [User!]!
    "Root comment ID when this comment is a reply"
    threadId: ID
    "Whether the current user is subscribed to this comment thread"
    threadSubscribed: Boolean!
    "Permissions of the current user on this comment"
    permissions: [CommentPermission!]!
    "Emoji reactions on the comment, grouped by emoji"
    reactions: [CommentReactionGroup!]!
  }

  input AddBuildCommentInput {
    buildId: ID!
    "Root comment ID to reply to"
    threadId: ID
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

  input SubscribeToCommentThreadInput {
    commentId: ID!
  }

  input UnsubscribeFromCommentThreadInput {
    commentId: ID!
  }

  input ResolveCommentThreadInput {
    commentId: ID!
  }

  input UnresolveCommentThreadInput {
    commentId: ID!
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
    "Subscribe the current user to a comment thread's notifications"
    subscribeToCommentThread(input: SubscribeToCommentThreadInput!): Comment!
    "Unsubscribe the current user from a comment thread's notifications"
    unsubscribeFromCommentThread(
      input: UnsubscribeFromCommentThreadInput!
    ): Comment!
    "Mark a comment thread as resolved"
    resolveCommentThread(input: ResolveCommentThreadInput!): Comment!
    "Reopen a resolved comment thread"
    unresolveCommentThread(input: UnresolveCommentThreadInput!): Comment!
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
    resolvedAt: (comment) => {
      return comment.resolvedAt ? new Date(comment.resolvedAt) : null;
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
    mentionedUsers: async (comment, _args, ctx) => {
      const userIds = await ctx.loaders.CommentMentionedUserIds.load(
        comment.id,
      );
      const accounts = await Promise.all(
        userIds.map((userId) =>
          ctx.loaders.AccountFromRelation.load({ userId }),
        ),
      );
      return accounts.filter((account) => account !== null);
    },
    threadId: (comment) => {
      return comment.threadId ? formatCommentId(comment.threadId) : null;
    },
    threadSubscribed: async (comment, _args, ctx) => {
      if (!ctx.auth) {
        return false;
      }
      const subscription =
        await CommentNotificationSubscription.query().findOne({
          commentId: comment.threadId ?? comment.id,
          userId: ctx.auth.user.id,
        });
      return subscription?.isSubscribed() ?? false;
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

      const thread = input.threadId
        ? await getCommentThreadForUser({
            id: input.threadId,
            user: auth.user,
            permission: "review",
            buildId: build.id,
          })
        : null;

      await createBuildComment({
        build,
        userId: auth.user.id,
        body: input.body as JSONContent,
        threadId: thread?.id ?? null,
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

      await assertCanReactToComment(comment, auth.user);

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

      await assertCanReactToComment(comment, auth.user);

      return removeCommentReaction({
        comment,
        userId: auth.user.id,
        emoji: input.emoji,
      });
    },
    subscribeToCommentThread: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const thread = await getCommentThreadForUser({
        id: args.input.commentId,
        user: auth.user,
        permission: "view",
      });
      await subscribeUserToCommentThread({
        commentId: thread.id,
        userId: auth.user.id,
      });
      return thread;
    },
    unsubscribeFromCommentThread: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const thread = await getCommentThreadForUser({
        id: args.input.commentId,
        user: auth.user,
        permission: "view",
      });
      await unsubscribeUserFromCommentThread({
        commentId: thread.id,
        userId: auth.user.id,
      });
      return thread;
    },
    resolveCommentThread: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const thread = await getCommentThreadForUser({
        id: args.input.commentId,
        user: auth.user,
        permission: "review",
      });
      return resolveCommentThread({ thread });
    },
    unresolveCommentThread: async (_root, args, ctx) => {
      const { auth } = ctx;
      if (!auth) {
        throw unauthenticated();
      }
      const thread = await getCommentThreadForUser({
        id: args.input.commentId,
        user: auth.user,
        permission: "review",
      });
      return unresolveCommentThread({ thread });
    },
  },
};
