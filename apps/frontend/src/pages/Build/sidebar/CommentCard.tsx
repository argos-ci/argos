import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { LinkIcon, MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "use-clipboard-copy";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { DocumentType, graphql } from "@/gql";
import { ReadOnlyEditor } from "@/ui/Editor/ReadOnlyEditor";
import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Time } from "@/ui/Time";

// Shared id so copying a comment link reuses a single toast instead of stacking.
const COPY_TOAST_ID = "comment-link-copied";

const _CommentFragment = graphql(`
  fragment CommentCard_Comment on Comment {
    id
    date
    content
    user {
      id
      name
      slug
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

export function CommentCard(props: {
  comment: DocumentType<typeof _CommentFragment>;
  highlighted?: boolean;
}) {
  const { comment, highlighted = false } = props;
  const ref = useRef<HTMLDivElement>(null);
  const clipboard = useClipboard();

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const copyLink = () => {
    const url = new URL(window.location.href);
    url.hash = comment.id;
    clipboard.copy(url.toString());
    toast.success("Link copied", {
      id: COPY_TOAST_ID,
      description: "The link to this comment was copied to your clipboard.",
    });
  };

  return (
    <div
      ref={ref}
      id={comment.id}
      className={clsx(
        "border-thin bg-app ring-primary -mx-1 rounded-md transition",
        highlighted ? "ring-2" : "ring-0",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {comment.user ? (
          <AccountAvatar
            avatar={comment.user.avatar}
            className="size-5 border"
          />
        ) : null}
        <span className="text-default text-xs font-medium">
          {comment.user?.name || comment.user?.slug || "Unknown user"}
        </span>
        <button
          type="button"
          onClick={copyLink}
          className="text-low hover:text-default cursor-pointer text-xs transition"
        >
          <Time date={comment.date} tooltip="title" />
        </button>
        <CommentActionsMenu onCopyLink={copyLink} />
      </div>
      <div className="text-default px-3 pb-2 text-sm">
        <ReadOnlyEditor content={comment.content} />
      </div>
    </div>
  );
}

function CommentActionsMenu(props: { onCopyLink: () => void }) {
  return (
    <MenuTrigger>
      <IconButton
        rounded
        size="small"
        aria-label="Comment actions"
        className="ml-auto"
      >
        <MoreHorizontalIcon />
      </IconButton>
      <Popover placement="bottom end">
        <Menu aria-label="Comment actions">
          <MenuItem onAction={props.onCopyLink}>
            <MenuItemIcon>
              <LinkIcon />
            </MenuItemIcon>
            Copy link to comment
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
