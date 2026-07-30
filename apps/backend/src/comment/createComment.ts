import { invariant } from "@argos/util/invariant";
import type { JSONContent } from "@tiptap/core";

import { Comment, Project } from "@/database/models";
import type { CommentAnchor } from "@/database/models/Comment";
import {
  autoSubscribeUserToBuild,
  getBuildSubscribedUserIds,
} from "@/database/services/build-notification-subscription";
import {
  getCommentThreadSubscribedUserIds,
  subscribeUserToCommentThread,
} from "@/database/services/comment-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";
import {
  getCommentNotificationData,
  notifyMentionedUsers,
} from "./commentNotifications";
import { syncCommentMentions } from "./mentions";
import {
  getCommentTargetColumns,
  getCommentTargetProject,
  type CommentTarget,
} from "./target";
import {
  isCommentEmpty,
  isCommentTooLarge,
  sanitizeCommentJson,
  validateCommentJson,
} from "./validate";

/**
 * Post a comment on a build or a test, auto-subscribe the author and notify the
 * other subscribers.
 *
 * The review options (`buildReviewId`, `pending`) and the diff anchoring
 * (`screenshotDiffId`, `anchor`) only apply to build targets; the database
 * rejects them on a test comment.
 *
 * When `pending` is set, the comment belongs to a review still in the `pending`
 * state — it is a draft, visible only to its author until the review is
 * submitted, so all notifications and the live broadcast are deferred to
 * submission time (see `notifyReviewCommentsWentLive` in `createBuildReview`).
 * Mentions are still persisted now so we know whom to notify then. The caller
 * already knows the review state, so it passes `pending` rather than us
 * re-reading the review.
 */
export async function createComment(input: {
  target: CommentTarget;
  userId: string;
  body: JSONContent;
  threadId?: string | null;
  screenshotDiffId?: string | null;
  anchor?: CommentAnchor | null;
  buildReviewId?: string | null;
  pending?: boolean;
}): Promise<Comment> {
  const {
    target,
    userId,
    threadId = null,
    screenshotDiffId = null,
    anchor = null,
    buildReviewId = null,
    pending = false,
  } = input;

  if (!validateCommentJson(input.body)) {
    throw boom(400, "Invalid comment body");
  }

  const body = sanitizeCommentJson(input.body);

  if (isCommentEmpty(body)) {
    throw boom(400, "Comment cannot be empty");
  }

  if (isCommentTooLarge(body)) {
    throw boom(400, "Comment is too large");
  }

  // Inserting the comment and loading the project are independent — run them
  // together rather than back-to-back.
  const [comment, project] = await Promise.all([
    Comment.query().insert({
      userId,
      ...getCommentTargetColumns(target),
      buildReviewId,
      threadId,
      screenshotDiffId,
      anchor,
      content: body,
    }),
    getCommentTargetProject(target),
  ]);

  // Persist the user mentions found in the comment and resolve them to the
  // users that may actually be notified (members of the project's team). Done
  // even for draft comments so submission knows whom to notify.
  const mentionedUserIds = await syncCommentMentions({ comment, project });

  // Subscribe the author so they receive updates on this thread (and, on a
  // build, on the build itself), whether the comment is live now or once the
  // review is submitted.
  const authorSubscriptions = threadId
    ? [subscribeUserToCommentThread({ commentId: threadId, userId })]
    : [
        ...(target.type === "build"
          ? [autoSubscribeUserToBuild({ buildId: target.build.id, userId })]
          : []),
        subscribeUserToCommentThread({ commentId: comment.id, userId }),
      ];

  if (pending) {
    // Defer notifications and the live broadcast to submission time. The
    // author's own client reflects the comment from the mutation result; other
    // clients (including the author's other tabs) reconcile on next load.
    await Promise.all(authorSubscriptions);
    return comment;
  }

  // Notifying the mentioned users is independent of notifying the thread/build
  // subscribers (those already exclude the mentioned users by id), so let it
  // run alongside them.
  const notifyMentioned = notifyMentionedUsers({
    target,
    project,
    comment,
    userId,
    mentionedUserIds,
    threadId: threadId ?? comment.id,
  });

  if (threadId) {
    await Promise.all([
      ...authorSubscriptions,
      notifyCommentThreadSubscribers({
        target,
        project,
        comment,
        userId,
        threadId,
        // Mentioned users get a dedicated notification, don't double-notify.
        excludeUserIds: mentionedUserIds,
      }),
      notifyMentioned,
    ]);
  } else {
    await Promise.all([
      ...authorSubscriptions,
      // Only builds carry a subscriber list; a new root comment on a test
      // reaches the users it mentions, and its replies then reach the thread.
      target.type === "build"
        ? notifyBuildSubscribers({
            target,
            project,
            comment,
            userId,
            excludeUserIds: mentionedUserIds,
          })
        : null,
      notifyMentioned,
    ]);
  }

  // Notify clients watching this target so the new comment appears live.
  await publishCommentChange({ type: "ADDED", comment });

  return comment;
}

async function notifyBuildSubscribers(input: {
  target: CommentTarget;
  project: Project;
  comment: Comment;
  userId: string;
  excludeUserIds: string[];
}): Promise<void> {
  const { target, project, comment, userId, excludeUserIds } = input;
  invariant(target.type === "build", "Only builds have subscribers");
  const subscribedUserIds = await getBuildSubscribedUserIds(target.build.id);
  const excluded = new Set([userId, ...excludeUserIds]);
  const recipients = subscribedUserIds.filter((id) => !excluded.has(id));
  if (recipients.length === 0) {
    return;
  }
  const data = await getCommentNotificationData({
    target,
    project,
    comment,
    userId,
  });
  await sendNotification({ type: "comment_added", data, recipients });
}

async function notifyCommentThreadSubscribers(input: {
  target: CommentTarget;
  project: Project;
  comment: Comment;
  userId: string;
  threadId: string;
  excludeUserIds: string[];
}): Promise<void> {
  const { target, project, comment, userId, threadId, excludeUserIds } = input;
  const subscribedUserIds = await getCommentThreadSubscribedUserIds(threadId);
  const excluded = new Set([userId, ...excludeUserIds]);
  const recipients = subscribedUserIds.filter((id) => !excluded.has(id));
  if (recipients.length === 0) {
    return;
  }
  const data = await getCommentNotificationData({
    target,
    project,
    comment,
    userId,
  });
  await sendNotification({ type: "comment_replied", data, recipients });
}
