import type { ApolloCache, Reference } from "@apollo/client";

import { CommentChangeType } from "@/gql/graphql";

/** What a comment feed hangs off: the build or the test it was posted on. */
export type CommentParent = { __typename: "Build" | "Test"; id: string };

/**
 * Apply a live comment change to the normalized cache.
 *
 * Apollo has already written the comment itself by the time a subscription's
 * `onData` runs, so only the parent's `comments` list needs touching: an added
 * comment is appended to it (ignored when already there, which is the case for
 * the client that posted it and got the list back from the mutation), and a
 * deleted one is evicted so the dangling ref is collected out of every list at
 * once — which is what lets `AnimatePresence` play the same exit animation as a
 * local delete. An update needs nothing: the cache merges the changed fields in
 * place by comment id.
 *
 * Shared by the build and test activity feeds, which differ only in their parent.
 */
export function applyCommentChange(input: {
  cache: ApolloCache;
  parent: CommentParent;
  type: CommentChangeType;
  commentId: string;
}): void {
  const { cache, parent, type, commentId } = input;
  const commentCacheId = cache.identify({
    __typename: "Comment",
    id: commentId,
  });
  if (!commentCacheId) {
    return;
  }
  switch (type) {
    case CommentChangeType.Added: {
      cache.modify({
        id: cache.identify(parent),
        fields: {
          comments(
            existingRefs: readonly Reference[] = [],
            { readField, toReference },
          ) {
            const ref = toReference(commentCacheId);
            if (
              !ref ||
              existingRefs.some(
                (existing) => readField("id", existing) === commentId,
              )
            ) {
              return existingRefs;
            }
            return [...existingRefs, ref];
          },
        },
      });
      return;
    }
    case CommentChangeType.Deleted: {
      cache.evict({ id: commentCacheId });
      cache.gc();
      return;
    }
    case CommentChangeType.Updated: {
      return;
    }
  }
}
