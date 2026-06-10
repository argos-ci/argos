import { useCallback } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/**
 * Per-thread collapse preference, persisted in local storage and keyed by the
 * root comment id. Only resolved threads are collapsible; unresolved threads
 * are always shown in full.
 */
const collapsedThreadsAtom = atomWithStorage<Record<string, boolean>>(
  "preferences.collapsedCommentThreads",
  {},
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
  const [collapsedThreads, setCollapsedThreads] = useAtom(collapsedThreadsAtom);
  const collapsed = resolved ? (collapsedThreads[commentId] ?? true) : false;
  const setCollapsed = useCallback(
    (value: boolean) => {
      setCollapsedThreads((prev) => ({ ...prev, [commentId]: value }));
    },
    [commentId, setCollapsedThreads],
  );
  return [collapsed, setCollapsed] as const;
}
