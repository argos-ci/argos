/** Viewport edge the popup never crosses. */
const VIEWPORT_MARGIN = 8;
/** Gap between the caret rect and the popup. */
const CARET_GAP = 4;

type GetRect = (() => DOMRect | null) | null | undefined;

/**
 * Position a suggestion popup against the caret rect provided by the suggestion
 * plugin. Hides the element when the rect is missing.
 *
 * Below the caret by default, flipped above it when there is no room — an
 * editor at the bottom of a sidebar would otherwise push its menu off screen —
 * and clamped horizontally so a caret near the right edge doesn't take the
 * menu with it.
 */
function positionSuggestionPopup(popup: HTMLElement, getRect: GetRect) {
  const rect = getRect?.();
  if (!rect) {
    popup.style.display = "none";
    return;
  }
  popup.style.display = "block";

  // Measured after `display` is restored, so a just-reshown popup has a size.
  const { width, height } = popup.getBoundingClientRect();

  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
  );
  const fitsBelow =
    rect.bottom + CARET_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
  const top = fitsBelow
    ? rect.bottom + CARET_GAP
    : Math.max(VIEWPORT_MARGIN, rect.top - CARET_GAP - height);

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Mount a suggestion popup (mention list, slash-command menu) holding
 * `content` on `document.body`, positioned with
 * {@link positionSuggestionPopup}.
 *
 * The content is a tiptap `ReactRenderer`, which commits a microtask after the
 * plugin's callbacks, so a size read there is the previous render's. The
 * plugin also calls `onUpdate` twice per keystroke, the first time with no
 * items while it fetches, so the last read was always of an empty list and the
 * clamp never applied. Placing it in the next frame reads the committed list,
 * still before anything is painted. A `ResizeObserver` cannot stand in: the
 * list goes full, empty, full within one frame, so it never sees a change.
 */
export function createSuggestionPopup(content: HTMLElement) {
  const popup = document.createElement("div");
  popup.style.position = "fixed";
  // Keep the suggestions above every overlay so they stay visible and clickable
  // when the editor is rendered inside one (e.g. the review submission popover).
  // The popup is appended to `document.body`, and react-aria gives its
  // popovers/modals an inline `z-index: 100000`, so this must clear that layer.
  popup.style.zIndex = "300000";
  popup.append(content);
  document.body.append(popup);

  let frame: number | null = null;
  const cancelFrame = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };

  return {
    update(getRect: GetRect) {
      cancelFrame();
      frame = requestAnimationFrame(() => {
        frame = null;
        positionSuggestionPopup(popup, getRect);
      });
    },
    destroy() {
      cancelFrame();
      popup.remove();
    },
  };
}
