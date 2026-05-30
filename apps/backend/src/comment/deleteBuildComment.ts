import type { Comment } from "@/database/models";

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

  return comment.$query().patchAndFetch({
    deletedAt: new Date().toISOString(),
  });
}
