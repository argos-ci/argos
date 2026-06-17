import { MessageSquareIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { ZOOMER_OVERLAY_INTERACTIVE_CLASS } from "@/containers/Build/Zoomer";

import type { ScreenPoint } from "./geometry";

type Avatar = React.ComponentProps<typeof AccountAvatar>["avatar"];

/**
 * A static indicator for the comment being drafted, drawn at the click point
 * with the current user's avatar. It mirrors a {@link CommentMarker}'s collapsed
 * (pin) look so the spot reads as "your comment will go here".
 */
export function CommentPin(props: {
  point: ScreenPoint;
  avatar: Avatar | null;
}) {
  const { point, avatar } = props;
  return (
    <div
      aria-hidden
      // Anchor the pin's bottom-left tip at the point, matching CommentMarker so
      // a draft pin doesn't jump when it becomes a real comment.
      style={{
        left: point.left,
        top: point.top,
        transform: "translateY(-100%)",
      }}
      className={`${ZOOMER_OVERLAY_INTERACTIVE_CLASS} bg-app border-primary rounded-chip pointer-events-none absolute z-10 flex size-9 items-center justify-center rounded-bl-none border shadow-md`}
    >
      {avatar ? (
        <AccountAvatar avatar={avatar} className="size-7 rounded-full" />
      ) : (
        <MessageSquareIcon className="text-low size-4" />
      )}
    </div>
  );
}
