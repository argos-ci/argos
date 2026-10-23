import { clsx } from "clsx";
import { MoreVerticalIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { List, ListRow } from "@/ui/List";
import {
  Menu,
  MenuItem,
  MenuItemTooltip,
  MenuRoot,
  MenuTrigger,
} from "@/ui/menu-kit";

import { AccountAvatar } from "./AccountAvatar";

export function RemoveMenu(props: {
  label: string;
  actionLabel: string;
  onRemove: () => void;
  disabled?: boolean;
  tooltip?: string | null;
}) {
  return (
    <MenuRoot>
      <MenuTrigger>
        <Button variant="ghost" size="small" iconOnly>
          <MoreVerticalIcon />
        </Button>
      </MenuTrigger>
      <Menu aria-label={props.label}>
        <MenuItem
          variant="danger"
          onAction={() => {
            props.onRemove();
          }}
          disabled={props.disabled}
          suffix={
            props.tooltip ? <MenuItemTooltip content={props.tooltip} /> : null
          }
        >
          {props.actionLabel}
        </MenuItem>
      </Menu>
    </MenuRoot>
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

/**
 * The list a page of people is shown in. On a phone it keeps a minimum width
 * and scrolls sideways inside a box that holds the card's width: side by side,
 * a row's role and actions left the name a word per line.
 */
export function UserList(props: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-md:overflow-x-auto">
      <List className={clsx("max-md:min-w-128", props.className)}>
        {props.children}
      </List>
    </div>
  );
}

export function UserListRow(props: {
  user: DocumentType<typeof _UserListRowFragment>;
  children?: React.ReactNode;
}) {
  const { user } = props;
  return (
    <ListRow className="flex items-center gap-6 px-4 py-2">
      <AccountAvatar avatar={user.avatar} className="size-9 shrink-0" />
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

/**
 * A row's role, as wide whether it is a select or a plain label, so the chips
 * and menus beside it stay in line from one row to the next.
 */
export function UserListRole(props: { children: React.ReactNode }) {
  return <div className="w-32 shrink-0">{props.children}</div>;
}

/** A role that cannot be changed, its text in line with a select's. */
export function UserListRoleLabel(props: { children: React.ReactNode }) {
  return <div className="text-low px-2 text-sm">{props.children}</div>;
}

/** Holds a row's place when it has no actions menu, as wide as the menu. */
export function UserListNoActions() {
  return <div className="w-6 shrink-0" />;
}

export const TeamMemberLabel: Record<TeamUserLevel, string> = {
  owner: "Owner",
  member: "Member",
  contributor: "Contributor",
};
