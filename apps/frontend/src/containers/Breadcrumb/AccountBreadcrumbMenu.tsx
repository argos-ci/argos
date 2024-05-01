import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { PlusCircleIcon } from "lucide-react";
import { matchPath, Link as RouterLink, useLocation } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuLoader,
  MenuState,
  MenuTitle,
  useMenuState,
} from "@/ui/Menu";

import { AccountItem } from "../AccountItem";

const AccountFragment = graphql(`
  fragment AccountBreadcrumbMenu_Account on Account {
    id
    slug
    ...AccountItem_Account
  }
`);

const MeQuery = graphql(`
  query AccountBreadcrumbMenu_me {
    me {
      id
      ...AccountBreadcrumbMenu_Account
      teams {
        id
        ...AccountBreadcrumbMenu_Account
      }
    }
  }
`);

type Account = FragmentType<typeof AccountFragment>;

function resolveAccountPath(slug: string, pathname: string) {
  if (matchPath("/:slug/settings/*", pathname)) {
    const parts = pathname.split("/");
    return "/" + [slug, ...parts.slice(2)].join("/");
  }
  return `/${slug}`;
}

function AccountMenuItems(props: { menu: MenuState; accounts: Account[] }) {
  const accounts = useFragment(AccountFragment, props.accounts);
  const location = useLocation();
  return (
    <>
      {accounts.map((account) => {
        return (
          <MenuItem key={account.id} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink
                {...menuItemProps}
                to={resolveAccountPath(account.slug, location.pathname)}
              >
                <AccountItem account={account} />
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
}

const MenuContent = (props: { menu: MenuState }) => {
  const { data } = useSuspenseQuery(MeQuery);
  if (!data.me) {
    return null;
  }
  const userAccounts = [data.me];
  const teamAccounts = data.me.teams;
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
            Create a Team
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
        {menu.open && (
          <Suspense
            fallback={
              <>
                <MenuTitle>Personal</MenuTitle>
                <MenuLoader />
                <MenuTitle>Teams</MenuTitle>
                <MenuLoader />
                <MenuItem state={menu} pointer>
                  {(menuItemProps) => (
                    <RouterLink {...menuItemProps} to="/teams/new">
                      <MenuItemIcon>
                        <PlusCircleIcon />
                      </MenuItemIcon>
                      Create a Team
                    </RouterLink>
                  )}
                </MenuItem>
              </>
            }
          >
            <MenuContent menu={menu} />
          </Suspense>
        )}
      </Menu>
    </>
  );
};
