import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";
import gqlTag from "graphql-tag";

import { getOrCreatePendingBuildReview } from "@/build/pendingReview";
import { isReviewableBuildStatus } from "@/build/reviewableStatus";
import { addCommentReaction } from "@/comment/addCommentReaction";
import {
  subscribeToCommentChanges,
  type CommentChangeType,
} from "@/comment/commentEvents";
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
import { getCommentThreadRoot } from "@/comment/thread";
import { updateBuildComment } from "@/comment/updateBuildComment";
import { Build } from "@/database/models/Build";
import { BuildReview } from "@/database/models/BuildReview";
import {
  Comment,
  CommentAnchorSchema,
  type CommentAnchor,
} from "@/database/models/Comment";
import { CommentNotificationSubscription } from "@/database/models/CommentNotificationSubscription";
import { ScreenshotDiff } from "@/database/models/ScreenshotDiff";
import type { User } from "@/database/models/User";
import {
  subscribeUserToCommentThread,
  unsubscribeUserFromCommentThread,
} from "@/database/services/comment-notification-subscription";

import {
  ICommentChangeType,
  type ICommentAnchorInput,
  type ICommentLinesAnchor,
  type ICommentPermission,
  type ICommentPointAnchor,
  type IResolvers,
} from "../__generated__/resolver-types";
import { assertCanViewBuild } from "../buildAccess";
import { badUserInput, forbidden, notFound, unauthenticated } from "../util";

const { gql } = gqlTag;

/**
 * Turn the comment-anchor input into the stored anchor shape, enforcing that
 * exactly one positioning is given. Bounds and shape are validated by the
 * model's {@link CommentAnchorSchema}.
 */
function commentAnchorFromInput(input: ICommentAnchorInput): CommentAnchor {
  const { point, lines } = input;
  if (Number(point != null) + Number(lines != null) !== 1) {
    throw badUserInput(
      "A comment anchor must set exactly one of point or lines",
    );
  }
  const candidate = point
    ? { type: "point", x: point.x, y: point.y }
    : { type: "lines", from: lines!.from, to: lines!.to };
  const result = CommentAnchorSchema.safeParse(candidate);
  if (!result.success) {
    throw badUserInput(
      result.error.issues[0]?.message ?? "Invalid comment anchor",
    );
  }
  return result.data;
}

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
  let commentId: string;
  try {
    commentId = parseCommentId(id);
  } catch {
    throw notFound("Thread not found");
  }
  const thread = await getCommentThreadRoot(commentId);
  if (!thread) {
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
  A point on a screenshot diff, in normalized coordinates (0–1 of the image's
  width/height). The baseline and compare sides render at the same scale, so a
  single coordinate applies to both.
  """
  type CommentPointAnchor {
    x: Float!
    y: Float!
  }

  "A 1-based inclusive line range on a textual snapshot."
  type CommentLinesAnchor {
    from: Int!
    to: Int!
  }

  """
  Where on the referenced screenshot diff a comment points. A null anchor on a
  comment that has a screenshotDiff means it refers to the whole diff.
  """
  union CommentAnchor = CommentPointAnchor | CommentLinesAnchor

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
    "Screenshot diff this comment is anchored to, if any"
    screenshotDiff: ScreenshotDiff
    "Where on the screenshot diff the comment points; null means the whole diff"
    anchor: CommentAnchor
    "Whether the current user is subscribed to this comment thread"
    threadSubscribed: Boolean!
    "Whether the comment belongs to a pending (unsubmitted) review and is only visible to its author"
    pending: Boolean!
    "Permissions of the current user on this comment"
    permissions: [CommentPermission!]!
    "Emoji reactions on the comment, grouped by emoji"
    reactions: [CommentReactionGroup!]!
  }

  input CommentPointAnchorInput {
    x: Float!
    y: Float!
  }

  input CommentLinesAnchorInput {
    from: Int!
    to: Int!
  }

  """
  Where on the referenced screenshot diff the comment points. Provide exactly
  one of the fields below.
  """
  input CommentAnchorInput {
    point: CommentPointAnchorInput
    lines: CommentLinesAnchorInput
  }

  input AddBuildCommentInput {
    buildId: ID!
    "Root comment ID to reply to"
    threadId: ID
    "Screenshot diff to anchor the comment to. Required when anchor is set."
    screenshotDiffId: ID
    "Where on the screenshot diff the comment points. Omit for a whole-diff reference."
    anchor: CommentAnchorInput
    "Rich-text JSON content of the comment"
    body: JSONObject!
    "Attach the comment to the current user's pending review (created if needed) instead of posting it immediately. Ignored for replies, which inherit their thread's review."
    addToReview: Boolean
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

  """
  How a comment changed: a new comment was added, an existing one was updated
  (edited, reacted to, or its thread resolved/reopened), or it was deleted.
  """
  enum CommentChangeType {
    ADDED
    UPDATED
    DELETED
  }

  """
  A comment that was added to, updated on, or deleted from a build, pushed live
  to subscribers.
  """
  type CommentChangeEvent {
    "How the comment changed"
    type: CommentChangeType!
    "The comment that changed. For a deletion, only its id is meaningful."
    comment: Comment!
  }

  type Subscription {
    "Emitted when a comment is added to, updated on, or deleted from the given build"
    buildCommentChanged(buildId: ID!): CommentChangeEvent!
  }
`;

/** Map the internal comment-change type to its GraphQL enum value. */
const COMMENT_CHANGE_EVENT_TYPE: Record<CommentChangeType, ICommentChangeType> =
  {
    ADDED: ICommentChangeType.Added,
    UPDATED: ICommentChangeType.Updated,
    DELETED: ICommentChangeType.Deleted,
  };

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
    screenshotDiff: async (comment, _args, ctx) => {
      if (!comment.screenshotDiffId) {
        return null;
      }
      return ctx.loaders.ScreenshotDiff.load(comment.screenshotDiffId);
    },
    // The stored anchor is structurally the union the schema exposes; only its
    // `side` differs nominally (model string-union vs generated enum), so cast.
    anchor: (comment) =>
      (comment.anchor ?? null) as
        ICommentPointAnchor | ICommentLinesAnchor | null,
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
    pending: async (comment, _args, ctx) => {
      if (!comment.buildReviewId) {
        return false;
      }
      const review = await ctx.loaders.BuildReview.load(comment.buildReviewId);
      return review?.state === "pending";
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
  CommentAnchor: {
    __resolveType: (anchor) => {
      switch ((anchor as CommentAnchor).type) {
        case "point":
          return "CommentPointAnchor";
        case "lines":
          return "CommentLinesAnchor";
        default:
          throw new Error("Unknown comment anchor type");
      }
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

      // A reply inherits its thread's anchor, so it can't carry its own.
      if (thread && (input.screenshotDiffId || input.anchor)) {
        throw badUserInput("A reply cannot be anchored to a screenshot diff");
      }

      // An anchor only makes sense against a diff to resolve it on.
      if (input.anchor && !input.screenshotDiffId) {
        throw badUserInput(
          "A screenshot diff is required to anchor a comment",
          { field: "screenshotDiffId" },
        );
      }

      let screenshotDiffId: string | null = null;
      if (input.screenshotDiffId) {
        // Only check the diff belongs to this build — a non-existent id would
        // fail the insert anyway, but a diff from another build would not.
        const diff = await ScreenshotDiff.query().findOne({
          id: input.screenshotDiffId,
          buildId: build.id,
        });
        if (!diff) {
          throw notFound("Screenshot diff not found");
        }
        screenshotDiffId = diff.id;
      }

      const anchor = input.anchor ? commentAnchorFromInput(input.anchor) : null;

      // A reply inherits its thread's review (so a reply to a draft comment
      // stays a draft); a root comment joins the user's pending review when
      // `addToReview` is set, creating that review on first use — but only when
      // the build can actually be reviewed, otherwise the draft would attach to
      // a review with no submit path and stay hidden forever. When it can't, we
      // fall back to posting a standalone (immediately visible) comment.
      let buildReviewId: string | null = null;
      let pending = false;
      if (thread) {
        buildReviewId = thread.buildReviewId;
        if (buildReviewId) {
          const review = await BuildReview.query()
            .findById(buildReviewId)
            .select("state");
          pending = review?.state === "pending";
        }
      } else if (input.addToReview) {
        const status = await ctx.loaders.BuildAggregatedStatus.load(build);
        if (isReviewableBuildStatus(status)) {
          const pendingReview = await getOrCreatePendingBuildReview({
            build,
            userId: auth.user.id,
          });
          buildReviewId = pendingReview.id;
          pending = pendingReview.state === "pending";
        }
      }

      await createBuildComment({
        build,
        userId: auth.user.id,
        body: input.body as JSONContent,
        threadId: thread?.id ?? null,
        screenshotDiffId,
        anchor,
        buildReviewId,
        pending,
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
  Subscription: {
    buildCommentChanged: {
      // Authorize before opening the stream so an unpermitted subscription is
      // rejected upfront rather than after the first event.
      subscribe: async (_root, args, ctx) => {
        await assertCanViewBuild(args.buildId, ctx.auth?.user ?? null);
        return (async function* () {
          for await (const change of subscribeToCommentChanges(args.buildId)) {
            // Field resolvers below run with the connection's shared loaders,
            // whose per-comment caches would otherwise pin the reactions and
            // mentions seen on the first event. Those relations live in their
            // own tables (not the comment row that travels through Redis), so
            // drop the changed comment's cached entries to resolve each event
            // against the current state — this is what makes live reactions and
            // edited mentions reflect reality across successive events.
            ctx.loaders.CommentReactions.clear(change.comment.id);
            ctx.loaders.CommentMentionedUserIds.clear(change.comment.id);
            yield {
              buildCommentChanged: {
                type: COMMENT_CHANGE_EVENT_TYPE[change.type],
                comment: change.comment,
              },
            };
          }
        })();
      },
    },
  },
};
