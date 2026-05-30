import type { Comment, User } from "@/database/models";

export type CommentPermission = "edit";

/**
 * Compute the permissions a user has on a given comment.
 * Only the author of a comment can edit it.
 */
export function getCommentPermissions(
  comment: Comment,
  user: User | null,
): CommentPermission[] {
  const permissions: CommentPermission[] = [];
  if (user && comment.userId === user.id) {
    permissions.push("edit");
  }
  return permissions;
}
