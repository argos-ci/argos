import React from "react";
import { gql } from "graphql-tag";
import { Link as ReactRouterLink, useRouteMatch } from "react-router-dom";
import { Box } from "@xstyled/styled-components";
import { FaChevronDown, FaExternalLinkAlt } from "react-icons/fa";
import { GoHome, GoRepo } from "react-icons/go";
import {
  HeaderBreadcrumbItem,
  HeaderBreadcrumbLink,
  Menu,
  MenuItem,
  MenuDisclosure,
  useMenuState,
  MenuDivider,
  MenuText,
  Link,
  MenuTitle,
} from "../../components";
import { Query } from "../../containers/Apollo";
import { OwnerAvatar } from "../../containers/OwnerAvatar";
import { useUser } from "../../containers/User";
import config from "../../config";

export function HomeBreadcrumbItem({ showTitle }) {
  return (
    <HeaderBreadcrumbItem>
      <HeaderBreadcrumbLink forwardedAs={ReactRouterLink} to={`/`}>
        <Box as={GoHome} height={{ xs: 20, md: 25 }} />
        {showTitle ? "Home" : null}
      </HeaderBreadcrumbLink>
    </HeaderBreadcrumbItem>
  );
}

export function OwnerBreadcrumbItem({ owner }) {
  const user = useUser();
  const menu = useMenuState({ placement: "bottom" });

  return (
    <HeaderBreadcrumbItem>
      <HeaderBreadcrumbLink
        forwardedAs={ReactRouterLink}
        to={`/${owner.login}`}
      >
        <OwnerAvatar owner={owner} size="sm" />
        {owner.login}
      </HeaderBreadcrumbLink>
      <Query
        query={gql`
          query Owners {
            owners {
              name
              login
            }
          }
        `}
      >
        {({ owners }) => {
          const ownersList = owners
            .filter(({ login }) => login !== owner.login)
            .sort((ownerA, ownerB) =>
              String(ownerA.name).localeCompare(String(ownerB.name))
            );
          if (ownersList.length === 0) return null;

          return (
            <>
              <MenuDisclosure {...menu} ml={-1}>
                <Box as={FaChevronDown} width="8px" />
              </MenuDisclosure>

              <Menu aria-label="Organizations list" {...menu} width="400px">
                <MenuTitle>Organizations</MenuTitle>
                <MenuDivider />
                <MenuItem
                  {...menu}
                  forwardedAs={ReactRouterLink}
                  to={`/${user.login}`}
                >
                  <OwnerAvatar owner={user} size="sm" />
                  {user.login}
                </MenuItem>
                {ownersList.map((owner) => (
                  <MenuItem
                    key={owner.login}
                    {...menu}
                    forwardedAs={ReactRouterLink}
                    to={`/${owner.login}`}
                  >
                    <OwnerAvatar owner={owner} size="sm" />
                    {owner.name}
                  </MenuItem>
                ))}

                <MenuDivider />
                <MenuText minWidth={200} fontWeight={600}>
                  Don’t see your org?
                  <br />
                  <Link
                    forwardedAs="a"
                    href={config.get("github.appUrl")}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontWeight="normal"
                  >
                    Manage access restrictions{" "}
                    <Box as={FaExternalLinkAlt} width={10} height={10} />
                  </Link>
                </MenuText>
              </Menu>
            </>
          );
        }}
      </Query>
    </HeaderBreadcrumbItem>
  );
}

export function RepositoryBreadcrumbItem({ repository }) {
  const menu = useMenuState({ placement: "bottom" });
  const {
    params: { ownerLogin },
  } = useRouteMatch();

  return (
    <HeaderBreadcrumbItem>
      <Box
        as={GoRepo}
        ml={1}
        width={{ xs: 20, md: 25 }}
        height={{ xs: 20, md: 25 }}
      />
      {repository.name}

      <Query
        query={gql`
          query Repositories($login: String!) {
            owner(login: $login) {
              id
              repositories {
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
            .filter((repo) => repo !== repository.name)
            .sort();

          if (repositoryLogins.length === 0) return null;

          return (
            <>
              <MenuDisclosure {...menu}>
                <Box as={FaChevronDown} width="8px" />
              </MenuDisclosure>

              <Menu aria-label="Repositories list" {...menu} width="400px">
                {repositoryLogins.map((repositoryLogin) => (
                  <MenuItem
                    key={repositoryLogin}
                    {...menu}
                    forwardedAs={ReactRouterLink}
                    to={`/${repositoryLogin}`}
                    minWidth="200px"
                  >
                    <Box as={GoRepo} width="20px" height="20px" mt={1} />
                    {repositoryLogin}
                  </MenuItem>
                ))}
              </Menu>
            </>
          );
        }}
      </Query>
    </HeaderBreadcrumbItem>
  );
}
