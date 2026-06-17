import { CommentCard } from "../sidebar/CommentCard";
import { CommentPopoverFrame } from "./CommentPopoverFrame";
import type { ScreenPoint } from "./geometry";

type CommentCardProps = React.ComponentProps<typeof CommentCard>;

/**
 * The full comment thread, shown as a floating card beside its pin once opened.
 * Reuses {@link CommentCard} (reply, resolve, react, edit, delete) without its
 * own border/chrome — the popover frame provides that — and without the
 * snapshot-reference header, which is redundant when drawn on the screenshot it
 * points to. Closing is handled by the layer (outside-click / Escape).
 */
export function CommentThreadPopover(props: {
  /** Anchor point (the pin's bottom-left tip) in viewport coordinates. */
  point: ScreenPoint;
  comment: CommentCardProps["comment"];
  replies: NonNullable<CommentCardProps["replies"]>;
  canReply: boolean;
  buildId: string;
}) {
  const { point, comment, replies, canReply, buildId } = props;
  const name = comment.user?.name || comment.user?.slug || "Unknown user";
  return (
    <CommentPopoverFrame
      point={point}
      offset={{ x: 44, y: -40 }}
      role="dialog"
      aria-label={`Comment from ${name}`}
      className="w-80"
    >
      {/* No horizontal padding so the thread (and its full-width reply divider)
          spans the whole card; the card's sections carry their own insets. */}
      <div className="bg-app border-thin max-h-96 w-full overflow-y-auto rounded-xl shadow-xl">
        <CommentCard
          buildId={buildId}
          comment={comment}
          replies={replies}
          highlightedCommentId={null}
          canReply={canReply}
          hideScreenshotReference
          embedded
          autoFocusReply
        />
      </div>
    </CommentPopoverFrame>
  );
}
