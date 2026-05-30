import { LinkIcon, MoreHorizontalIcon, PencilIcon } from "lucide-react";

import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

export function CommentActionsMenu(props: {
  onCopyLink: () => void;
  /** When provided, an "Edit comment" action is shown. */
  onEdit?: () => void;
}) {
  const { onCopyLink, onEdit } = props;
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
          {onEdit ? (
            <MenuItem onAction={onEdit}>
              <MenuItemIcon>
                <PencilIcon />
              </MenuItemIcon>
              Edit comment
            </MenuItem>
          ) : null}
          <MenuItem onAction={onCopyLink}>
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
