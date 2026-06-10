import type { Comment } from "@/database/models";

/**
 * Mark a comment thread as resolved by stamping `resolvedAt` on its root
 * comment. The operation is idempotent: resolving an already-resolved thread is
 * a no-op and returns the root comment unchanged. No notification is sent.
 */
export async function resolveCommentThread(input: {
  thread: Comment;
}): Promise<Comment> {
  const { thread } = input;

  if (thread.resolvedAt) {
    return thread;
  }

  return thread.$query().patchAndFetch({
    resolvedAt: new Date().toISOString(),
  });
}

/**
 * Reopen a resolved comment thread by clearing `resolvedAt` on its root
 * comment. The operation is idempotent: reopening a thread that isn't resolved
 * is a no-op and returns the root comment unchanged.
 */
export async function unresolveCommentThread(input: {
  thread: Comment;
}): Promise<Comment> {
  const { thread } = input;

  if (!thread.resolvedAt) {
    return thread;
  }

  return thread.$query().patchAndFetch({
    resolvedAt: null,
  });
}
