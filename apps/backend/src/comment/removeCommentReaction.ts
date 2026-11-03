import { parseEmoji } from "@argos/util/emoji";

import { Comment, CommentReaction } from "@/database/models";
import { boom } from "@/util/error";

import { publishCommentChange } from "./commentEvents";

/**
 * Remove a user's emoji reaction from a comment. The operation is idempotent:
 * removing a reaction that doesn't exist is a no-op.
 */
export async function removeCommentReaction(input: {
  comment: Comment;
  userId: string;
  emoji: string;
}): Promise<Comment> {
  const { comment, userId } = input;

  const emoji = parseEmoji(input.emoji);
  if (!emoji) {
    throw boom(400, "Invalid emoji");
  }

  // The migration that normalized reactions runs before the rollout, so rows
  // the previous release wrote in between keep emojibase 17's trailing U+FE0F
  // ("👍️").
  const deletedCount = await CommentReaction.query()
    .where({ commentId: comment.id, userId })
    .whereIn("emoji", [emoji, `${emoji}\u{FE0F}`])
    .delete();

  // No reaction to remove: nothing changed, nothing to broadcast.
  if (deletedCount === 0) {
    return comment;
  }

  // Notify clients watching this target so the reaction disappears live. The
  // comment row is unchanged; subscribers re-resolve its `reactions` field.
  await publishCommentChange({ type: "UPDATED", comment });

  return comment;
}
