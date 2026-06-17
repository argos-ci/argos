import { useState } from "react";
import { clsx } from "clsx";
import { MessageSquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { ZOOMER_OVERLAY_INTERACTIVE_CLASS } from "@/containers/Build/Zoomer";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { Time } from "@/ui/Time";
import { getMentionUser } from "@/ui/UserCard";

import { CommentCard } from "../sidebar/CommentCard";
import type { ScreenPoint } from "./geometry";

type CommentCardProps = React.ComponentProps<typeof CommentCard>;
type Comment = CommentCardProps["comment"];

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
  // The preview only shows on hover while the thread popover is closed; once
  // open the pin is just a selected marker beside the popover.
  const expanded = hovered && !open;

  return createPortal(
    <div
      className={clsx(
        ZOOMER_OVERLAY_INTERACTIVE_CLASS,
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
        aria-label={`Open comment from ${name}`}
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
          <div className="shrink-0 p-1">
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
