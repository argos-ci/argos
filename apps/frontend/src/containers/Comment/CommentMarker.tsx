import { useState } from "react";
import { flip, useFloating } from "@floating-ui/react-dom";
import { clsx } from "clsx";
import { CheckIcon, MessageSquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import type { ScreenPoint } from "@/containers/Build/projection";
import {
  ZOOMER_OVERLAY_INTERACTIVE_CLASS,
  ZOOMER_OVERLAY_SCROLLABLE_CLASS,
} from "@/containers/Build/Zoomer";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { Time } from "@/ui/Time";
import { getMentionUser } from "@/ui/UserCard";

import { THREAD_GAP, THREAD_WIDTH } from "./CommentThreadPopover";
import { PIN_SIZE, usePinReference, WINDOW_PADDING } from "./usePinReference";

/**
 * What the marker reads — deliberately narrower than any one page's fragment.
 *
 * It used to be typed against `BuildCommentCard`'s comment, which tied a purely
 * presentational pin to the build's data requirements. These are the fields the
 * preview actually renders, and every comment fragment has them.
 */
type Comment = {
  user: {
    name?: string | null;
    slug: string;
    avatar: React.ComponentProps<typeof AccountAvatar>["avatar"];
  } | null;
  date: string;
  content: React.ComponentProps<typeof ReadOnlyEditor>["content"];
  mentionedUsers: Parameters<typeof getMentionUser>[0][];
  /** Set on a thread that is done: the pin then wears a check. */
  resolvedAt: string | null;
};

/** Width of the expanded preview card (`w-72`). */
const PREVIEW_WIDTH = 288;
/**
 * How far the open thread reaches from the pin's far edge, pin and gap
 * included. The side is picked for this width rather than the preview's, so a
 * preview never grows toward one side while its thread opens on the other.
 */
const THREAD_REACH = PIN_SIZE + THREAD_GAP + THREAD_WIDTH;
const TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] } as const;

/**
 * A comment anchored on the changes image, drawn as a pin whose bottom-left tip
 * sits on the anchor point. On hover it expands in place, extending up and to
 * the right (to the left when the window ends too close on the right), into a
 * preview: the avatar rises to the top, the author/time slide in beside it and
 * the comment appears below. Clicking opens the full thread,
 * shown as a separate popover beside the pin (see {@link CommentThreadPopover}),
 * so while open the pin stays put as a selected marker.
 *
 * A resolved thread's pin is only on the image because the reviewer expanded the
 * thread (see `useIsThreadAnchorShown`), so it wears a check: an expansion
 * outlives the session it was made in, and a pin that still looked open would
 * hand back work that is already done.
 */
export function CommentMarker(props: {
  /** Anchor point (the pin's bottom-left tip) in viewport coordinates. */
  point: ScreenPoint;
  comment: Comment;
  open: boolean;
  onOpen: () => void;
}) {
  const { point, comment, open, onOpen } = props;
  const [hovered, setHovered] = useState(false);
  const mentionedUsers = comment.mentionedUsers.map(getMentionUser);
  const name = comment.user?.name || comment.user?.slug || "Unknown user";
  const resolved = Boolean(comment.resolvedAt);
  // The preview only shows on hover while the thread popover is closed; once
  // open the pin is just a selected marker beside the popover.
  const expanded = hovered && !open;
  const reference = usePinReference(point);
  // Only the side comes from floating-ui, and only while the preview is out:
  // a collapsed pin looks the same on either side. The position stays on the
  // point in CSS, so panning the image moves every pin in the same frame, at
  // the same fractional offset as the image, without a computation per pin.
  const { refs, placement } = useFloating({
    strategy: "fixed",
    placement: "top-start",
    elements: { reference: expanded ? reference : null },
    middleware: [
      flip({
        mainAxis: false,
        fallbackPlacements: ["top-end"],
        padding: WINDOW_PADDING,
      }),
    ],
  });
  const flipped = placement === "top-end";

  return createPortal(
    <div
      ref={refs.setFloating}
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        ZOOMER_OVERLAY_SCROLLABLE_CLASS,
        "pointer-events-none fixed flex items-end",
        flipped && "justify-end",
        expanded || open ? "z-50" : "z-40",
      )}
      // As wide as the thread will be, which is what floating-ui measures.
      // `translateY(-100%)` keeps its bottom edge on the point as the card
      // grows, so it extends upward. The card sits at its start, on the pin's
      // left edge, and extends to the right; flipped, the box ends on the
      // pin's right edge, and the card sits at its end and extends to the left.
      style={{
        left: flipped ? point.left + PIN_SIZE : point.left,
        top: point.top,
        width: THREAD_REACH,
        transform: flipped ? "translate(-100%, -100%)" : "translateY(-100%)",
      }}
    >
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={
          resolved
            ? `Open resolved comment from ${name}`
            : `Open comment from ${name}`
        }
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={onOpen}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        initial={{ width: PIN_SIZE }}
        animate={{ width: expanded ? PREVIEW_WIDTH : PIN_SIZE }}
        transition={TRANSITION}
        className={clsx(
          "bg-app rounded-chip pointer-events-auto cursor-pointer overflow-hidden shadow-md outline-none",
          open ? "ring-primary ring-2" : "border-thin",
          // Flipped, the card's content is laid out from its right edge, so the
          // avatar stays on the pin as the card widens to the left.
          flipped &&
            "flex flex-col items-end transition-[border-radius] duration-180",
          // A flipped preview's bottom-left corner is a card's width away from
          // the point, so it would not be the tip anymore: it rounds off, and
          // the avatar, still on the pin, marks the spot.
          !(flipped && expanded) && "rounded-bl-none",
        )}
      >
        {/* Top row, laid out at the full preview width so the avatar stays put
            while the author/time are revealed as the card widens. */}
        <div
          className={clsx(
            "flex w-72 items-center",
            flipped && "flex-row-reverse",
          )}
        >
          <div className="relative shrink-0 p-1">
            {comment.user ? (
              <AccountAvatar
                avatar={comment.user.avatar}
                className="size-7 rounded-full"
              />
            ) : (
              <div className="bg-ui text-low flex size-7 items-center justify-center rounded-full">
                <MessageSquareIcon className="size-4" />
              </div>
            )}
            {/* On the avatar rather than on the pin's corner: the corner is
                rounded and the card clips its overflow, and the badge has to
                hold the same spot once the card grows into the preview. */}
            {resolved ? (
              <div
                aria-hidden
                className="bg-app border-thin text-low absolute right-1 bottom-1 flex size-3.5 items-center justify-center rounded-full"
              >
                <CheckIcon className="size-2.5" />
              </div>
            ) : null}
          </div>
          <div
            className={clsx(
              "flex min-w-0 items-baseline gap-1.5",
              // Flipped, the author starts where the comment below starts.
              flipped ? "flex-1 pr-1 pl-2" : "pr-3 pl-1",
            )}
          >
            <span className="text-default min-w-0 truncate text-xs font-medium">
              {name}
            </span>
            <Time
              date={comment.date}
              tooltip="none"
              className="text-low text-xxs shrink-0"
            />
          </div>
        </div>
        {/* The comment grows the card upward (the bottom stays pinned). */}
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="preview-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={TRANSITION}
              className="w-72 overflow-hidden"
            >
              {/* No `repositoryUrl`: the preview is a clamped teaser whose only
                  click opens the thread, and a commit link inside it would take
                  that click to the code host instead. Shas are linked in the
                  card the pin opens. */}
              <div className="text-default line-clamp-4 px-2 pb-2 text-sm">
                <ReadOnlyEditor
                  content={comment.content}
                  mentionedUsers={mentionedUsers}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}
