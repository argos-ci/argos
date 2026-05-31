import {
  BellIcon,
  BellOffIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { IconButton } from "@/ui/IconButton";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

export function CommentActionsMenu(props: {
  onCopyLink: () => void;
  threadSubscribed: boolean;
  onSubscribeThread: () => void;
  onUnsubscribeThread: () => void;
  /** When provided, an "Edit comment" action is shown. */
  onEdit?: () => void;
  /** When provided, a "Delete comment" action is shown. */
  onDelete?: () => void;
}) {
  const {
    onCopyLink,
    onSubscribeThread,
    onUnsubscribeThread,
    threadSubscribed,
    onEdit,
    onDelete,
  } = props;
  return (
    <MenuTrigger>
      <IconButton rounded size="small" aria-label="Comment actions">
        <MoreHorizontalIcon />
      </IconButton>
      <Popover placement="bottom end">
        <Menu aria-label="Comment actions">
          {onEdit ? (
            <MenuItem onAction={onEdit}>
              <MenuItemIcon>
                <PencilIcon />
              </MenuItemIcon>
              Edit
            </MenuItem>
          ) : null}
          <MenuItem onAction={onCopyLink}>
            <MenuItemIcon>
              <LinkIcon />
            </MenuItemIcon>
            Copy link to comment
          </MenuItem>
          <MenuItem
            onAction={
              threadSubscribed ? onUnsubscribeThread : onSubscribeThread
            }
          >
            <MenuItemIcon>
              {threadSubscribed ? <BellOffIcon /> : <BellIcon />}
            </MenuItemIcon>
            {threadSubscribed
              ? "Unsubscribe from thread"
              : "Subscribe to thread"}
          </MenuItem>
          {onDelete ? (
            <>
              <MenuSeparator />
              <MenuItem variant="danger" onAction={onDelete}>
                <MenuItemIcon>
                  <Trash2Icon />
                </MenuItemIcon>
                Delete
              </MenuItem>
            </>
          ) : null}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
