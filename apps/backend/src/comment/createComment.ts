import { assertNever } from "@argos/util/assertNever";
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
import {
  autoSubscribeUserToTest,
  getTestSubscribedUserIds,
} from "@/database/services/test-notification-subscription";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";
import {
  getCommentNotificationData,
  getCommentRecipients,
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

  // Subscribe the author so they receive updates on this thread and on the
  // build or test it lives on, whether the comment is live now or once the
  // review is submitted. The auto-subscribe respects an earlier intentional
  // unsubscription, so commenting again never silently re-subscribes someone
  // who opted out.
  const authorSubscriptions = threadId
    ? [subscribeUserToCommentThread({ commentId: threadId, userId })]
    : [
        autoSubscribeUserToTarget({ target, userId }),
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
      notifyTargetSubscribers({
        target,
        project,
        comment,
        userId,
        // Mentioned users get a dedicated notification, don't double-notify.
        excludeUserIds: mentionedUserIds,
      }),
      notifyMentioned,
    ]);
  }

  // Notify clients watching this target so the new comment appears live.
  await publishCommentChange({ type: "ADDED", comment });

  return comment;
}

/** Follow a build or a test, whichever the comment was posted on. */
async function autoSubscribeUserToTarget(input: {
  target: CommentTarget;
  userId: string;
}): Promise<void> {
  const { target, userId } = input;
  switch (target.type) {
    case "build":
      await autoSubscribeUserToBuild({ buildId: target.build.id, userId });
      return;
    case "test":
      await autoSubscribeUserToTest({ testId: target.test.id, userId });
      return;
    case "media":
      // Nothing to subscribe to. A build gets new builds and a test keeps
      // running, so both have a stream worth following; a media is one file that
      // never changes. Following the *thread* is what matters here, and
      // `comment_notifications_subscriptions` handles that for every target.
      return;
    default:
      assertNever(target);
  }
}

/** The users following a build or a test. */
async function getTargetSubscribedUserIds(
  target: CommentTarget,
): Promise<string[]> {
  switch (target.type) {
    case "build":
      return getBuildSubscribedUserIds(target.build.id);
    case "test":
      return getTestSubscribedUserIds(target.test.id);
    case "media":
      // No target-level followers exist for a media — see
      // `autoSubscribeUserToTarget`. Thread subscribers are notified separately.
      return [];
    default:
      assertNever(target);
  }
}

async function notifyTargetSubscribers(input: {
  target: CommentTarget;
  project: Project;
  comment: Comment;
  userId: string;
  excludeUserIds: string[];
}): Promise<void> {
  const { target, project, comment, userId, excludeUserIds } = input;
  const subscribedUserIds = await getTargetSubscribedUserIds(target);
  const recipients = await getCommentRecipients({
    project,
    userIds: subscribedUserIds,
    excludeUserIds: [userId, ...excludeUserIds],
  });
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
  const recipients = await getCommentRecipients({
    project,
    userIds: subscribedUserIds,
    excludeUserIds: [userId, ...excludeUserIds],
  });
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
