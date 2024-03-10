import { FragmentType, graphql, useFragment } from "@/gql";
import { ListRow } from "@/ui/List";
import { Menu, MenuButton, MenuItem, useMenuState } from "@/ui/Menu";
import { Tooltip } from "@/ui/Tooltip";
import { MoreVerticalIcon } from "lucide-react";
import { AccountAvatar } from "./AccountAvatar";
import { ProjectUserLevel, TeamUserLevel } from "@/gql/graphql";

export function RemoveMenu(props: {
  label: string;
  actionLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  tooltip?: string | null;
}) {
  const menu = useMenuState({ gutter: 4 });

  return (
    <>
      <MenuButton
        state={menu}
        className="flex shrink-0 items-center justify-center"
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </MenuButton>
      <Menu state={menu} aria-label={props.label}>
        <Tooltip content={props.tooltip}>
          <MenuItem
            variant="danger"
            state={menu}
            onClick={() => {
              props.onRemove();
              menu.hide();
            }}
            disabled={props.disabled}
            accessibleWhenDisabled
          >
            {props.actionLabel}
          </MenuItem>
        </Tooltip>
      </Menu>
    </>
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
    <ListRow className="px-4 py-2 items-center">
      <AccountAvatar avatar={user.avatar} size={36} className="shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{user.name}</div>
        </div>
        <div className="text-xs text-low">{user.slug}</div>
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
