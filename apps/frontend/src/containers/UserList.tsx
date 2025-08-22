import { MoreVerticalIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemTooltip, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

import { AccountAvatar } from "./AccountAvatar";

export function RemoveMenu(props: {
  label: string;
  actionLabel: string;
  onRemove: () => void;
  isDisabled?: boolean;
  tooltip?: string | null;
}) {
  return (
    <MenuTrigger>
      <IconButton>
        <MoreVerticalIcon />
      </IconButton>
      <Popover>
        <Menu aria-label={props.label}>
          <MenuItem
            variant="danger"
            onAction={() => {
              props.onRemove();
            }}
            isDisabled={props.isDisabled}
          >
            {props.tooltip && <MenuItemTooltip content={props.tooltip} />}
            {props.actionLabel}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

const _UserListRowFragment = graphql(`
  fragment UserListRow_user on User {
    id
    slug
    name
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

export function UserListRow(props: {
  user: DocumentType<typeof _UserListRowFragment>;
  children?: React.ReactNode;
}) {
  const { user } = props;
  return (
    <ListRow className="flex items-center gap-6 px-4 py-2">
      <AccountAvatar avatar={user.avatar} size={36} className="shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{user.name}</div>
        </div>
        <div className="text-low text-xs">{user.slug}</div>
      </div>
      {props.children}
    </ListRow>
  );
}

export const TeamMemberLabel: Record<TeamUserLevel, string> = {
  owner: "Owner",
  member: "Member",
  contributor: "Contributor",
};
