import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { useLiveRef } from "@/ui/useLiveRef";

/**
 * Reads a `#comment-…` hash from the URL and, when it matches a loaded comment,
 * returns its id so the comment can be highlighted. The highlight clears on the
 * next click anywhere, after 3 seconds, or when the component unmounts.
 *
 * Shared by every activity feed that can be deep-linked into (a build's review
 * activity, a test's).
 */
export function useHighlightedCommentId(commentIds: string[]): string | null {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const hashId = hash.slice(1);
  const matchedId = hashId && commentIds.includes(hashId) ? hashId : null;
  const matchedIdRef = useLiveRef(matchedId);
  const clear = useCallback(() => {
    if (matchedIdRef.current) {
      navigate({ hash: "" }, { replace: true });
    }
  }, [navigate, matchedIdRef]);
  // Clear when we click outside.
  useEffect(() => {
    if (!matchedId) {
      return;
    }
    document.addEventListener("click", clear, { once: true, capture: true });
    return () => {
      document.removeEventListener("click", clear, { capture: true });
    };
  }, [matchedId, clear]);
  // Clear after 3s.
  useEffect(() => {
    if (!matchedId) {
      return;
    }
    const id = window.setTimeout(clear, 3000);
    return () => window.clearTimeout(id);
  }, [matchedId, clear]);
  // Clear at unmount.
  useEffect(() => clear, [clear]);
  return matchedId;
}
