import { Link as RouterLink } from "react-router-dom";
import { LinkExternalIcon } from "@primer/octicons-react";
import {
  useMenuState,
  MenuTitle,
  Menu,
  MenuSeparator,
  MenuItem,
  MenuItemIcon,
  MenuText,
  MenuState,
} from "@/modern/ui/Menu";
import config from "@/config";
import { useQuery } from "@apollo/client";
import { OwnerAvatar } from "@/modern/containers/OwnerAvatar";
import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/modern/ui/Breadcrumb";
import { Anchor } from "@/modern/ui/Link";

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

  return (
    <>
      <BreadcrumbMenuButton state={menu} />

      <Menu aria-label="Organizations" state={menu}>
        <MenuTitle>Organizations</MenuTitle>
        {menu.open && <Owners menu={menu} />}
        <MenuText>
          Don&apos;t see your org?
          <br />
          <Anchor href={config.get("github.appUrl")} target="_blank">
            Manage access restrictions{" "}
            <LinkExternalIcon className="h-[1em] w-[1em]" />
          </Anchor>
        </MenuText>
      </Menu>
    </>
  );
};
