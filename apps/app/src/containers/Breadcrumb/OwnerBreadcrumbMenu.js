import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import {
  BaseLink,
  IllustratedText,
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
import { Query } from "../Apollo";
import { OwnerAvatar } from "../OwnerAvatar";
import { useUser } from "../User";
import config from "../../config";
import { LinkExternalIcon } from "@primer/octicons-react";

const OWNERS_QUERY = gql`
  query OWNERS_QUERY {
    owners {
      id
      name
      login
    }
  }
`;

export function OwnerBreadcrumbMenu(props) {
  const { ownerLogin } = useParams();
  const user = useUser();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <>
      <MenuButton state={menu} px={0} pt={2} {...props}>
        <MenuButtonArrow />
      </MenuButton>

      <Menu aria-label="Organizations list" state={menu}>
        <Query
          query={OWNERS_QUERY}
          fallback={<Loader />}
          skip={!menu.open || !ownerLogin}
        >
          {(data) => {
            if (!data?.owners) {
              return <MenuText>No organization found</MenuText>;
            }

            const ownersList = data.owners
              .filter(({ login }) => login !== ownerLogin)
              .sort((ownerA, ownerB) =>
                String(ownerA.name).localeCompare(String(ownerB.name))
              );

            if (ownersList.length === 0) {
              return <MenuText>No organization found</MenuText>;
            }

            return (
              <>
                <MenuTitle>Organizations</MenuTitle>
                <MenuSeparator />

                {user.login !== ownerLogin && (
                  <MenuItem state={menu} as={BaseLink} to={`/${user.login}`}>
                    <OwnerAvatar owner={user} size="sm" />
                    {user.login}
                  </MenuItem>
                )}

                {ownersList.map((owner) => (
                  <MenuItem
                    key={owner.login}
                    state={menu}
                    as={BaseLink}
                    to={`/${owner.login}`}
                  >
                    <OwnerAvatar owner={owner} size="sm" />
                    {owner.name}
                  </MenuItem>
                ))}

                <MenuSeparator />
                <MenuText>
                  Don’t see your org?
                  <IllustratedText
                    as={Link}
                    href={config.get("github.appUrl")}
                    target="_blank"
                    icon={LinkExternalIcon}
                    reverse
                    fontWeight="medium"
                    mt={1}
                    display="flex"
                  >
                    Manage access restrictions
                  </IllustratedText>
                </MenuText>
              </>
            );
          }}
        </Query>
      </Menu>
    </>
  );
}
