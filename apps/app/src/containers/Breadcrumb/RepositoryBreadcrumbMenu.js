import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { GoRepo } from "react-icons/go";
import {
  Menu,
  MenuItem,
  useMenuState,
  MenuButton,
  MenuButtonArrow,
  MenuTitle,
  MenuSeparator,
  MenuText,
  Link,
  BaseLink,
  Icon,
} from "@argos-ci/app/src/components";
import { Query } from "../Apollo";

export function RepositoryBreadcrumbMenu({ ...props }) {
  const { ownerLogin, repositoryName } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <Query
      query={gql`
        query Repositories($login: String!) {
          owner(login: $login) {
            id
            repositories(enabled: true) {
              id
              name
            }
          }
        }
      `}
      variables={{ login: ownerLogin }}
    >
      {({ owner: { repositories } }) => {
        const repositoryLogins = repositories
          .map(({ name }) => name)
          .filter((repo) => repo !== repositoryName)
          .sort();

        if (repositoryLogins.length === 0) return null;

        return (
          <>
            <MenuButton state={menu} px={0} pt={2} {...props}>
              <MenuButtonArrow />
            </MenuButton>

            <Menu aria-label="Repositories list" state={menu}>
              <MenuTitle>Repositories list</MenuTitle>
              <MenuSeparator />

              {repositoryLogins.map((repositoryLogin) => (
                <MenuItem
                  key={repositoryLogin}
                  state={menu}
                  as={BaseLink}
                  to={`/${repositoryLogin}`}
                  minWidth="200px"
                >
                  <Icon as={GoRepo} w={5} h={5} mt={1} />
                  {repositoryLogin}
                </MenuItem>
              ))}

              <MenuSeparator />
              <MenuText>
                Don’t see your repo?
                <Link
                  to={`/${ownerLogin}`}
                  fontWeight="medium"
                  display="flex"
                  mt={1}
                >
                  Be sure to activate it →
                </Link>
              </MenuText>
            </Menu>
          </>
        );
      }}
    </Query>
  );
}
