import React from "react";
import { useParams } from "react-router-dom";
import { gql } from "graphql-tag";
import { RepoIcon } from "@primer/octicons-react";
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
  Loader,
} from "@argos-ci/app/src/components";
import { Query } from "../Apollo";

const OWNER_REPOSITORIES_QUERY = gql`
  query OWNER_REPOSITORIES_QUERY($login: String!) {
    owner(login: $login) {
      id
      repositories(enabled: true) {
        id
        name
      }
    }
  }
`;

export function RepositoryBreadcrumbMenu({ ...props }) {
  const { ownerLogin, repositoryName } = useParams();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <>
      <MenuButton state={menu} px={0} pt={2} {...props}>
        <MenuButtonArrow />
      </MenuButton>

      <Menu aria-label="Repositories list" state={menu}>
        <Query
          query={OWNER_REPOSITORIES_QUERY}
          variables={{ login: ownerLogin }}
          fallback={<Loader />}
          skip={!menu.open || !repositoryName}
        >
          {(data) => {
            if (!data?.owner) return <MenuText>No repository found</MenuText>;

            const repositoryLogins = data.owner.repositories
              .map(({ name }) => name)
              .filter((repo) => repo !== repositoryName)
              .sort();

            if (repositoryLogins.length === 0) {
              return <MenuText>No organization found</MenuText>;
            }

            return (
              <>
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
                    <Icon as={RepoIcon} w={5} h={5} mt={1} />
                    {repositoryLogin}
                  </MenuItem>
                ))}
              </>
            );
          }}
        </Query>

        <MenuSeparator />
        <MenuText>
          Don’t see your repo?
          <Link to={`/${ownerLogin}`} fontWeight="medium" display="flex" mt={1}>
            Be sure to activate it →
          </Link>
        </MenuText>
      </Menu>
    </>
  );
}
