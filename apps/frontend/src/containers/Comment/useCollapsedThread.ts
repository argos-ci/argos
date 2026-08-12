import { useCallback } from "react";
import { atom, useAtom, useAtomValue } from "jotai";
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

/**
 * The expanded ids as a set, derived once so membership tests share an identity
 * that only changes when the preference does — unlike the per-thread family,
 * this one re-renders its readers on every toggle, which is the point.
 */
const expandedThreadIdsAtom = atom((get) => new Set(get(expandedThreadsAtom)));

/**
 * Whether a thread is drawn where it is anchored — its pin on a screenshot, its
 * inline card on a diff. An unresolved thread always is; a resolved one only
 * while the user keeps it expanded, so the anchor comes back with the thread it
 * explains. "The primary button is misaligned here" needs the pin to say where
 * *here* is, and a resolved thread whose pin is gone for good reads as a riddle.
 *
 * A predicate rather than the set itself, so the rule lives next to the collapse
 * state it reads and the three anchored surfaces cannot drift apart.
 */
export function useIsThreadAnchorShown(): (root: {
  id: string;
  resolvedAt: string | null;
}) => boolean {
  const expandedThreadIds = useAtomValue(expandedThreadIdsAtom);
  return useCallback(
    (root) => !root.resolvedAt || expandedThreadIds.has(root.id),
    [expandedThreadIds],
  );
}
