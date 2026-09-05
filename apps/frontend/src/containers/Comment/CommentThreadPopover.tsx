import type { ScreenPoint } from "@/containers/Build/projection";

import { CommentPopoverFrame } from "./CommentPopoverFrame";

/**
 * The full comment thread, shown as a floating card beside its pin once opened.
 *
 * The card itself comes from the caller: a build's card carries a screenshot
 * reference and a build reply mutation, a media's does not, and baking either in
 * would make this component belong to one page. What it owns is the framing and
 * the placement. Closing is handled by the layer (outside-click / Escape).
 */
export function CommentThreadPopover(props: {
  /** Anchor point (the pin's bottom-left tip) in viewport coordinates. */
  point: ScreenPoint;
  /** For the dialog's accessible name. */
  authorName: string;
  children: React.ReactNode;
}) {
  const { point, authorName, children } = props;
  return (
    <CommentPopoverFrame
      point={point}
      offset={{ x: 44, y: -40 }}
      role="dialog"
      aria-label={`Comment from ${authorName}`}
      className="w-80"
    >
      {/* No horizontal padding so the thread (and its full-width reply divider)
          spans the whole card; the card's sections carry their own insets.

          Two boxes because the fade cannot share one with the card: a mask
          fades the border and shadow along with the messages. The outer box
          draws the card and clips the scroller to its corners; the inner one
          scrolls.

          Top edge only. The composer is the last thing in the thread and it
          takes focus on open, which scrolls this box to the bottom — so the
          fade that means something is the one over the earlier messages, and a
          bottom fade would land on the field being typed in. */}
      <div className="bg-app border-thin w-full overflow-hidden rounded-xl shadow-xl">
        <div className="scroll-mask-t-from-90% max-h-96 overflow-y-auto">
          {children}
        </div>
      </div>
    </CommentPopoverFrame>
  );
}
