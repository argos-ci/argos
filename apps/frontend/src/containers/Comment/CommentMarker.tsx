import { useState } from "react";
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

/** Pin badge size: a size-7 (28px) avatar with 4px (`p-1`) padding all around. */
const PIN_SIZE = 36;
/** Width of the expanded preview card (`w-72`). */
const PREVIEW_WIDTH = 288;
const TRANSITION = { duration: 0.18, ease: [0.4, 0, 0.2, 1] } as const;

/**
 * A comment anchored on the changes image, drawn as a pin whose bottom-left tip
 * sits on the anchor point. On hover it expands in place — extending up and to
 * the right — into a preview: the avatar rises to the top, the author/time slide
 * in beside it and the comment appears below. Clicking opens the full thread,
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

  return createPortal(
    <div
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
        ZOOMER_OVERLAY_SCROLLABLE_CLASS,
        "pointer-events-none fixed",
        expanded || open ? "z-50" : "z-40",
      )}
      // Pin the bottom-left tip at the point: `translateY(-100%)` keeps the
      // bottom edge on the point as the card grows, so it extends upward; the
      // left edge stays put, so it also extends to the right.
      style={{
        left: point.left,
        top: point.top,
        transform: "translateY(-100%)",
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
          "bg-app rounded-chip pointer-events-auto cursor-pointer overflow-hidden rounded-bl-none shadow-md outline-none",
          open ? "ring-primary ring-2" : "border-thin",
        )}
      >
        {/* Top row, laid out at the full preview width so the avatar stays put
            while the author/time are revealed as the card widens. */}
        <div className="flex w-72 items-center">
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
          <div className="flex min-w-0 items-baseline gap-1.5 pr-3 pl-1">
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
