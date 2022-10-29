/* eslint-disable react/no-unescaped-entities */
import { LinkExternalIcon } from "@primer/octicons-react";
import { gql } from "graphql-tag";

import {
  BaseLink,
  Link,
  Loader,
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuItem,
  MenuSeparator,
  MenuText,
  MenuTitle,
  useMenuState,
} from "@argos-ci/app/src/components";

import config from "../../config";
import { Query } from "../Apollo";
import { OwnerAvatar, OwnerAvatarFragment } from "../OwnerAvatar";

const BREADCRUMB_MENU_OWNERS_QUERY = gql`
  query BREADCRUMB_MENU_OWNERS_QUERY {
    owners {
      id
      name
      login

      ...OwnerAvatarFragment
    }
  }
  ${OwnerAvatarFragment}
`;

export function OwnerBreadcrumbMenu(props) {
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <>
      <MenuButton state={menu} shape="square" {...props}>
        <MenuButtonArrow state={menu} />
      </MenuButton>

      <Menu aria-label="Organizations" state={menu}>
        <MenuTitle>Organizations</MenuTitle>
        <MenuSeparator />

        {menu.open && (
          <Query query={BREADCRUMB_MENU_OWNERS_QUERY} fallback={<Loader />}>
            {({ owners }) => {
              if (owners.length === 0) {
                return <MenuText>No organization found</MenuText>;
              }

              return owners.map((owner) => {
                return (
                  <MenuItem
                    key={owner.login}
                    state={menu}
                    as={BaseLink}
                    to={`/${owner.login}`}
                  >
                    <OwnerAvatar owner={owner} size="sm" />
                    {owner.name}
                  </MenuItem>
                );
              });
            }}
          </Query>
        )}

        <MenuSeparator />
        <MenuText>
          Don't see your org?
          <br />
          <Link href={config.get("github.appUrl")} target="_blank">
            Manage access restrictions <LinkExternalIcon />
          </Link>
        </MenuText>
      </Menu>
    </>
  );
}
