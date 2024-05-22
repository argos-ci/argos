import { InfoIcon, MoreVerticalIcon } from "lucide-react";

import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectUserLevel, TeamUserLevel } from "@/gql/graphql";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

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
            {props.tooltip && (
              <MenuItemIcon>
                <Tooltip content={props.tooltip}>
                  <InfoIcon className="size-[1em]" />
                </Tooltip>
              </MenuItemIcon>
            )}
            {props.actionLabel}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

const UserListRowFragment = graphql(`
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
  user: FragmentType<typeof UserListRowFragment>;
  children?: React.ReactNode;
}) {
  const user = useFragment(UserListRowFragment, props.user);
  return (
    <ListRow className="items-center px-4 py-2">
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

export const ProjectContributorLabel: Record<ProjectUserLevel, string> = {
  admin: "Admin",
  viewer: "Viewer",
  reviewer: "Reviewer",
};
