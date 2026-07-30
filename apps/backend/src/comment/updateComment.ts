import type { JSONContent } from "@tiptap/core";

import type { Comment } from "@/database/models";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";
import { notifyMentionedUsers } from "./commentNotifications";
import { getCommentMentionedUserIds, syncCommentMentions } from "./mentions";
import { getCommentTargetProject, resolveCommentTarget } from "./target";
import {
  isCommentEmpty,
  isCommentTooLarge,
  sanitizeCommentJson,
  validateCommentJson,
} from "./validate";

/**
 * Update the content of an existing comment and stamp its `editedAt` date so
 * consumers can tell it has been edited.
 *
 * Re-syncs the comment's mentions: mentions removed in the edit are deleted,
 * and users newly mentioned by the edit are subscribed and notified (existing
 * mentions are left untouched, so editing never re-notifies them).
 */
export async function updateComment(input: {
  comment: Comment;
  body: JSONContent;
}): Promise<Comment> {
  const { comment } = input;

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

  const previousMentionedUserIds = new Set(
    await getCommentMentionedUserIds(comment.id),
  );

  const updatedComment = await comment.$query().patchAndFetch({
    content: body,
    editedAt: new Date().toISOString(),
  });

  const target = await resolveCommentTarget(updatedComment);
  const project = await getCommentTargetProject(target);

  const mentionedUserIds = await syncCommentMentions({
    comment: updatedComment,
    project,
  });

  // Only notify users that weren't already mentioned before the edit.
  const newlyMentionedUserIds = mentionedUserIds.filter(
    (id) => !previousMentionedUserIds.has(id),
  );

  await notifyMentionedUsers({
    target,
    project,
    comment: updatedComment,
    userId: updatedComment.userId,
    mentionedUserIds: newlyMentionedUserIds,
    threadId: updatedComment.threadId ?? updatedComment.id,
  });

  // Notify clients watching this target so the edit appears live.
  await publishCommentChange({ type: "UPDATED", comment: updatedComment });

  return updatedComment;
}
