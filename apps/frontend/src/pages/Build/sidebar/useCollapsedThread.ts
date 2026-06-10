import { atom, useAtom } from "jotai";
import { atomFamily } from "jotai-family";
import { atomWithStorage, RESET } from "jotai/utils";

/**
 * Ids of resolved threads the user has explicitly expanded, persisted in local
 * storage. Resolved threads are collapsed by default, so only these exceptions
 * are stored: an id is dropped as soon as its thread collapses back to the
 * default, and the key is removed entirely once none remain.
 */
const expandedThreadsAtom = atomWithStorage<string[]>(
  "preferences.expandedCommentThreads",
  [],
);

/**
 * Per-thread collapse state derived from {@link expandedThreadsAtom}. A family
 * of derived atoms keeps threads isolated — toggling one re-renders only that
 * thread, since every other thread's derived value is unchanged.
 */
const collapsedThreadAtomFamily = atomFamily((commentId: string) =>
  atom(
    (get) => !get(expandedThreadsAtom).includes(commentId),
    (get, set, collapsed: boolean) => {
      const expanded = get(expandedThreadsAtom);
      if (collapsed) {
        if (!expanded.includes(commentId)) {
          return;
        }
        const next = expanded.filter((id) => id !== commentId);
        // Forget the whole key once no thread is expanded anymore.
        set(expandedThreadsAtom, next.length === 0 ? RESET : next);
      } else if (!expanded.includes(commentId)) {
        set(expandedThreadsAtom, [...expanded, commentId]);
      }
    },
  ),
);

/**
 * Read and update whether a comment thread is collapsed. Resolved threads
 * default to collapsed until the user expands them; unresolved threads are
 * never collapsed regardless of the stored preference.
 */
export function useCollapsedThread(
  commentId: string,
  resolved: boolean,
): readonly [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useAtom(
    collapsedThreadAtomFamily(commentId),
  );
  return [resolved && collapsed, setCollapsed] as const;
}
