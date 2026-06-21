import { Comment } from "@/database/models";

/**
 * Resolve the non-deleted root comment of the thread a comment belongs to.
 *
 * A standalone/root comment is its own thread; a reply points at the root via
 * `threadId`. Thread-level state (resolution, subscriptions) always lives on the
 * root, so callers operating on "the thread" go through this. Returns `null`
 * when the comment — or the thread root it points at — is missing or
 * soft-deleted.
 */
export async function getCommentThreadRoot(
  commentId: string,
): Promise<Comment | null> {
  const comment = await Comment.query().findById(commentId);
  if (!comment || comment.deletedAt) {
    return null;
  }
  const threadId = comment.threadId ?? comment.id;
  if (threadId === comment.id) {
    return comment;
  }
  const thread = await Comment.query().findById(threadId);
  if (!thread || thread.deletedAt) {
    return null;
  }
  return thread;
}
