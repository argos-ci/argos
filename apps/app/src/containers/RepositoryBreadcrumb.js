import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { GoRepo } from "react-icons/go";
import {
  BreadcrumbItem,
  Menu,
  MenuItem,
  useMenuState,
  MenuButton,
  BreadcrumbSeparator,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  MenuButtonArrow,
  MenuTitle,
  MenuSeparator,
  MenuText,
  Link,
  BaseLink,
} from "@argos-ci/app/src/components";
import { Query, useQuery } from "./Apollo";
import { useRepository, RepositoryContextFragment } from "./RepositoryContext";

const GET_REPOSITORY = gql`
  query Repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      ...RepositoryContextFragment
    }
  }

  ${RepositoryContextFragment}
`;

export function RepositorySelect({ ...props }) {
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
                  <x.svg as={GoRepo} w={5} h={5} mt={1} />
                  {repositoryLogin}
                </MenuItem>
              ))}

              <MenuSeparator />
              <MenuText>
                Don’t see your repo?
                <Link
                  to={`/${ownerLogin}`}
                  fontWeight="medium"
                  display="block"
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

export function RepositoryBreadcrumbItem() {
  const { ownerLogin, repositoryName } = useParams();
  const { setRepository } = useRepository();
  const { loading, data = {} } = useQuery(GET_REPOSITORY, {
    variables: { ownerLogin, repositoryName },
    fetchPolicy: "no-cache",
    skip: !ownerLogin || !repositoryName,
  });
  const { repository } = data;

  React.useEffect(() => {
    if (!loading && !!repository) {
      setRepository(repository);
    }
  }, [loading, repository, setRepository]);

  if (!repository) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`${repository.owner.login}/${repository.name}/builds`}
        >
          <x.svg
            as={GoRepo}
            mt={1}
            width={{ _: 20, md: 25 }}
            height={{ _: 20, md: 25 }}
          />
          {repository.name}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <RepositorySelect />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
