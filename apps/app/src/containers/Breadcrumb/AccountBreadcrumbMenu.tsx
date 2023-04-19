import { useQuery } from "@apollo/client";
import { HomeIcon } from "@primer/octicons-react";
import { Link as RouterLink } from "react-router-dom";

import config from "@/config";
import { AccountAvatar } from "@/containers/AccountAvatar";
import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import { Anchor } from "@/ui/Link";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuState,
  MenuText,
  MenuTitle,
  useMenuState,
} from "@/ui/Menu";

const MeQuery = graphql(`
  query AccountBreadcrumbMenu_me {
    me {
      id
      account {
        id
        slug
        name
      }
      teams {
        id
        account {
          id
          slug
          name
        }
      }
    }
  }
`);

const Accounts = (props: { menu: MenuState }) => {
  const { data, error } = useQuery(MeQuery);
  if (error) return null;
  if (!data?.me) return null;
  const accounts = [
    data.me.account,
    ...data.me.teams.map((team) => team.account),
  ];
  return (
    <>
      {accounts.map((account) => {
        return (
          <MenuItem key={account.slug} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink {...menuItemProps} to={`/${account.slug}`}>
                <MenuItemIcon>
                  <AccountAvatar account={account} size={18} />
                </MenuItemIcon>
                {account.name}
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
};

export const AccountBreadcrumbMenu = () => {
  const menu = useMenuState({ placement: "bottom", gutter: 4 });
  const title = "Switch context";

  return (
    <>
      <BreadcrumbMenuButton state={menu} />

      <Menu aria-label={title} state={menu}>
        <MenuTitle>{title}</MenuTitle>
        <MenuItem state={menu}>
          {(menuItemProps) => (
            <RouterLink {...menuItemProps} to="/">
              <MenuItemIcon>
                <HomeIcon />
              </MenuItemIcon>
              All my repositories
            </RouterLink>
          )}
        </MenuItem>
        {menu.open && <Accounts menu={menu} />}
        <MenuText>
          Don&apos;t see your org?
          <br />
          <Anchor href={config.get("github.appUrl")} external>
            Manage access restrictions
          </Anchor>
        </MenuText>
      </Menu>
    </>
  );
};
