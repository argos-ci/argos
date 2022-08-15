import React from "react";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import { Route, Link, Switch, useRouteMatch } from "react-router-dom";
import { Box } from "@xstyled/styled-components";
import { GoRepo, GoHome } from "react-icons/go";
import { FaGithub } from "react-icons/fa";
import {
  Header,
  HeaderBody,
  HeaderBreadcrumb,
  HeaderBreadcrumbItem,
  HeaderBreadcrumbLink,
  HeaderPrimary,
  HeaderSecondaryLink,
  RouterTabItem,
  TabList,
  Text,
} from "../../components";
import { Query } from "../../containers/Apollo";
import {
  RepositoryProvider,
  RepositoryContextFragment,
  useRepository,
} from "./RepositoryContext";
import { RepositoryBuilds } from "./Builds";
import { RepositorySettings } from "./Settings";
import { BuildDetail } from "./BuildDetail/index";
import { GettingStarted } from "./GettingStarted";
import { NotFound } from "../NotFound";
import { OwnerAvatar } from "../../containers/OwnerAvatar";

function hasWritePermission(repository) {
  return repository.permissions.includes("write");
}

function RepositoryHeader() {
  const repository = useRepository();
  const match = useRouteMatch();

  return (
    <Header>
      <HeaderBody>
        <HeaderPrimary>
          <HeaderBreadcrumb>
            <HeaderBreadcrumbItem>
              <HeaderBreadcrumbLink forwardedAs={Link} to={`/`}>
                <Box as={GoHome} />
              </HeaderBreadcrumbLink>
            </HeaderBreadcrumbItem>
            <HeaderBreadcrumbItem>
              <HeaderBreadcrumbLink
                forwardedAs={Link}
                to={`/${repository.owner.login}`}
              >
                <OwnerAvatar owner={repository.owner} size="sm" />
                {repository.owner.login}
              </HeaderBreadcrumbLink>
            </HeaderBreadcrumbItem>
            <HeaderBreadcrumbItem>
              <Box as={GoRepo} />
              {repository.name}
            </HeaderBreadcrumbItem>
          </HeaderBreadcrumb>
          <HeaderSecondaryLink
            forwardedAs="a"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://github.com/${repository.owner.login}/${repository.name}`}
          >
            <Box forwardedAs={FaGithub} mr={2} />
            <Text>
              {repository.owner.login}/{repository.name}
            </Text>
          </HeaderSecondaryLink>
        </HeaderPrimary>
        <TabList>
          <RouterTabItem to={`${match.url}/builds`}>Builds</RouterTabItem>
          {hasWritePermission(repository) ? (
            <RouterTabItem to={`${match.url}/settings`}>Settings</RouterTabItem>
          ) : null}
        </TabList>
      </HeaderBody>
    </Header>
  );
}

const GET_REPOSITORY = gql`
  query Repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      ...RepositoryContextFragment
    }
  }

  ${RepositoryContextFragment}
`;

export function Repository({
  match: {
    url,
    params: { ownerLogin, repositoryName },
  },
}) {
  return (
    <Query
      query={GET_REPOSITORY}
      variables={{ ownerLogin, repositoryName }}
      fetchPolicy="no-cache"
    >
      {({ repository }) => {
        if (!repository) {
          return <NotFound />;
        }

        return (
          <RepositoryProvider repository={repository}>
            <>
              <Helmet
                titleTemplate={`%s - ${repository.owner.login}/${repository.name}`}
                defaultTitle={`${repository.owner.login}/${repository.name}`}
              />
              <RepositoryHeader />
              <Switch>
                <Route exact path={`${url}/builds/:buildNumber(\\d+)`}>
                  <BuildDetail />
                </Route>
                <Route exact path={`${url}/builds`}>
                  <RepositoryBuilds />
                </Route>
                <Route exact path={`${url}/getting-started`}>
                  <GettingStarted />
                </Route>
                {hasWritePermission(repository) ? (
                  <Route exact path={`${url}/settings`}>
                    <RepositorySettings />
                  </Route>
                ) : null}
                <Route>
                  <NotFound />
                </Route>
              </Switch>
            </>
          </RepositoryProvider>
        );
      }}
    </Query>
  );
}
