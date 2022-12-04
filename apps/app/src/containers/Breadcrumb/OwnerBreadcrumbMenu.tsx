import { useQuery } from "@apollo/client";
import { HomeIcon } from "@primer/octicons-react";
import { Link as RouterLink } from "react-router-dom";

import config from "@/config";
import { OwnerAvatar } from "@/containers/OwnerAvatar";
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

const OwnersQuery = graphql(`
  query OwnerBreadcrumbMenu_owners {
    owners {
      id
      login
      name
    }
  }
`);

const Owners = (props: { menu: MenuState }) => {
  const { data, error } = useQuery(OwnersQuery);
  if (error) return null;
  if (!data) return null;
  return (
    <>
      {data.owners.map((owner) => {
        return (
          <MenuItem key={owner.login} state={props.menu} pointer>
            {(menuItemProps) => (
              <RouterLink {...menuItemProps} to={`/${owner.login}`}>
                <MenuItemIcon>
                  <OwnerAvatar owner={owner} size={18} />
                </MenuItemIcon>
                {owner.name}
              </RouterLink>
            )}
          </MenuItem>
        );
      })}
    </>
  );
};

export const OwnerBreadcrumbMenu = () => {
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
        {menu.open && <Owners menu={menu} />}
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
