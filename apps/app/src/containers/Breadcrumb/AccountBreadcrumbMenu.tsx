import { useQuery } from "@apollo/client";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { Link as RouterLink } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { FragmentType, graphql, useFragment } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuState,
  MenuTitle,
  useMenuState,
} from "@/ui/Menu";

const AccountFragment = graphql(`
  fragment AccountBreadcrumbMenu_Account on Account {
    id
    slug
    name
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

const MeQuery = graphql(`
  query AccountBreadcrumbMenu_me {
    me {
      id
      account {
        id
        ...AccountBreadcrumbMenu_Account
      }
      teams {
        id
        account {
          id
          ...AccountBreadcrumbMenu_Account
        }
      }
    }
  }
`);

type Account = FragmentType<typeof AccountFragment>;

const AccountMenuItems = (props: { menu: MenuState; accounts: Account[] }) => {
  const accounts = useFragment(AccountFragment, props.accounts);
  return (
    <>
      {accounts.map((account) => {
        return (
          <MenuItem key={account.id} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink {...menuItemProps} to={`/${account.slug}`}>
                <MenuItemIcon>
                  <AccountAvatar avatar={account.avatar} size={18} />
                </MenuItemIcon>
                {account.name || account.slug}
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
};

const MenuContent = (props: { menu: MenuState }) => {
  const { data, error } = useQuery(MeQuery);
  if (error) return null;
  if (!data?.me) return null;
  const userAccounts = [data.me.account];
  const teamAccounts = data.me.teams.map((team) => team.account);
  return (
    <>
      <MenuTitle>Personal</MenuTitle>
      <AccountMenuItems menu={props.menu} accounts={userAccounts} />
      <MenuTitle>Teams</MenuTitle>
      <AccountMenuItems menu={props.menu} accounts={teamAccounts} />
      <MenuItem state={props.menu} pointer>
        {(menuItemProps) => (
          <RouterLink {...menuItemProps} to="/teams/new">
            <MenuItemIcon>
              <PlusCircleIcon />
            </MenuItemIcon>
            Create Team
          </RouterLink>
        )}
      </MenuItem>
    </>
  );
};

export const AccountBreadcrumbMenu = () => {
  const menu = useMenuState({ placement: "bottom", gutter: 4 });
  return (
    <>
      <BreadcrumbMenuButton state={menu} />

      <Menu aria-label="Accounts" state={menu}>
        {menu.open && <MenuContent menu={menu} />}
      </Menu>
    </>
  );
};
