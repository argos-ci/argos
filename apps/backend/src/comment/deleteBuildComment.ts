import type { Comment } from "@/database/models";

import { publishCommentChange } from "./commentEvents";

/**
 * Soft-delete a build comment by stamping its `deletedAt` date. The operation
 * is idempotent: deleting an already-deleted comment is a no-op and returns the
 * comment unchanged.
 */
export async function deleteBuildComment(input: {
  comment: Comment;
}): Promise<Comment> {
  const { comment } = input;

  if (comment.deletedAt) {
    return comment;
  }

  const deletedComment = await comment.$query().patchAndFetch({
    deletedAt: new Date().toISOString(),
  });

  // Notify clients watching this build so the comment disappears live.
  await publishCommentChange({
    buildId: deletedComment.buildId,
    type: "DELETED",
    comment: deletedComment,
  });

  return deletedComment;
}
