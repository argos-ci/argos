import type { Comment } from "@/database/models";

import { publishCommentChange } from "./commentEvents";

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

  const resolvedThread = await thread.$query().patchAndFetch({
    resolvedAt: new Date().toISOString(),
  });

  // Notify clients watching this build so the thread collapses live.
  await publishCommentChange({
    buildId: resolvedThread.buildId,
    type: "UPDATED",
    comment: resolvedThread,
  });

  return resolvedThread;
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

  const reopenedThread = await thread.$query().patchAndFetch({
    resolvedAt: null,
  });

  // Notify clients watching this build so the thread reopens live.
  await publishCommentChange({
    buildId: reopenedThread.buildId,
    type: "UPDATED",
    comment: reopenedThread,
  });

  return reopenedThread;
}
