import { Comment, CommentReaction } from "@/database/models";
import { boom } from "@/util/error";

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

  await CommentReaction.query().deleteById([comment.id, userId, emoji]);

  return comment;
}
