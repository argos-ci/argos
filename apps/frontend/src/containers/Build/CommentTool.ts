import { useCallback } from "react";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type CommentToolMode = "hand" | "comment";

/**
 * The active viewer tool. `hand` pans/zooms (the default behavior); `comment`
 * lets the user click a point on the changes image to leave a comment. Kept in
 * memory (not persisted) so it resets to `hand` on reload.
 */
export const commentToolModeAtom = atom<CommentToolMode>("hand");

/**
 * Whether on-screenshot comments (pins and their threads) are shown. Persisted
 * like the other viewer preferences (see `overlayVisibleAtom`).
 */
export const commentsVisibleAtom = atomWithStorage<boolean>(
  "preferences.comments.visible",
  true,
);

/**
 * A one-shot request to open a point-anchored comment's thread on the changes
 * image, carrying the thread root's comment id. Set when jumping to a comment
 * from outside the viewer (the sidebar's "Go to this snapshot"); the screenshot
 * layer consumes it — opening the matching marker's thread, then resetting it to
 * null — once that comment's diff is shown. Null when there's nothing to open.
 */
export const requestedScreenshotCommentIdAtom = atom<string | null>(null);

/**
 * Comment-tool state with its cross-field invariants in one place: picking the
 * Comment tool always reveals comments, and hiding comments always drops back to
 * the Hand tool — you can't place a comment you can't see.
 */
export function useCommentTool() {
  const [mode, setMode] = useAtom(commentToolModeAtom);
  const [visible, setVisible] = useAtom(commentsVisibleAtom);

  const activateHand = useCallback(() => setMode("hand"), [setMode]);

  const activateComment = useCallback(() => {
    setMode("comment");
    setVisible(true);
  }, [setMode, setVisible]);

  const setCommentsVisible = useCallback(
    (next: boolean) => {
      setVisible(next);
      if (!next) {
        setMode("hand");
      }
    },
    [setVisible, setMode],
  );

  return { mode, visible, activateHand, activateComment, setCommentsVisible };
}
