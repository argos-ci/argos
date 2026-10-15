import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

import { useResizeObserver } from "./useResizeObserver";

/** Scrolls a row, when it scrolls at all, until its selected item shows. */
function revealSelected(row: HTMLElement | null, selector: string) {
  const item = row?.querySelector<HTMLElement>(selector);
  if (!row || !item) {
    return;
  }
  if (item.offsetLeft < row.scrollLeft) {
    row.scrollLeft = item.offsetLeft;
  } else if (
    item.offsetLeft + item.offsetWidth >
    row.scrollLeft + row.clientWidth
  ) {
    row.scrollLeft = item.offsetLeft + item.offsetWidth - row.clientWidth;
  }
}

/**
 * Keeps the selected item of a row that scrolls sideways in view, on a phone:
 * after each navigation, and when the row narrows, which a page that opts into
 * the phone layout does after it first rendered at the desktop width.
 *
 * The row must be the offset parent of its items (`relative`).
 */
export function useRevealSelected(selector: string) {
  const { pathname } = useLocation();
  const rowRef = useRef<HTMLElement>(null);
  const ref = useResizeObserver(
    () => revealSelected(rowRef.current, selector),
    rowRef,
  );
  useLayoutEffect(() => {
    revealSelected(rowRef.current, selector);
  }, [pathname, selector]);
  return ref;
}
