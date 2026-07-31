/**
 * A root comment together with its replies. Replies are the comments whose
 * `threadId` points back at the root.
 */
export type CommentThread<T> = { root: T; replies: T[] };

/**
 * Group a flat list of comments into threads. Comments with no `threadId` are
 * roots; the others are attached as replies to their root, in their original
 * order. Replies whose root isn't in the list are dropped (the root was
 * filtered out or not yet loaded).
 *
 * Generic over the comment shape so it works wherever `CommentCard_Comment` is
 * selected (the sidebar activity feed and the on-screenshot overlay).
 */
export function getCommentThreads<
  T extends { id: string; threadId: string | null },
>(comments: readonly T[]): CommentThread<T>[] {
  const commentsById = new Map(
    comments.map((comment) => [comment.id, comment]),
  );
  const repliesByThreadId = new Map<string, T[]>();
  const roots: T[] = [];

  for (const comment of comments) {
    if (!comment.threadId) {
      roots.push(comment);
      continue;
    }
    if (!commentsById.has(comment.threadId)) {
      continue;
    }
    const replies = repliesByThreadId.get(comment.threadId);
    if (replies) {
      replies.push(comment);
    } else {
      repliesByThreadId.set(comment.threadId, [comment]);
    }
  }

  return roots.map((root) => ({
    root,
    replies: repliesByThreadId.get(root.id) ?? [],
  }));
}
