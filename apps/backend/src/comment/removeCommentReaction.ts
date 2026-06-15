import { Comment, CommentReaction } from "@/database/models";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";
import { isValidEmoji } from "./reactions";

/**
 * Remove a user's emoji reaction from a comment. The operation is idempotent:
 * removing a reaction that doesn't exist is a no-op.
 */
export async function removeCommentReaction(input: {
  comment: Comment;
  userId: string;
  emoji: string;
}): Promise<Comment> {
  const { comment, userId, emoji } = input;

  if (!isValidEmoji(emoji)) {
    throw boom(400, "Invalid emoji");
  }

  const deletedCount = await CommentReaction.query().deleteById([
    comment.id,
    userId,
    emoji,
  ]);

  // No reaction to remove: nothing changed, nothing to broadcast.
  if (deletedCount === 0) {
    return comment;
  }

  // Notify clients watching this build so the reaction disappears live. The
  // comment row is unchanged; subscribers re-resolve its `reactions` field.
  await publishCommentChange({
    buildId: comment.buildId,
    type: "UPDATED",
    comment,
  });

  return comment;
}
