import React from 'react'
import { Helmet } from 'react-helmet'
import gql from 'graphql-tag'
import { Route, Link, Switch, Redirect, useLocation } from 'react-router-dom'
import styled, { Box } from '@xstyled/styled-components'
import { GoRepo } from 'react-icons/go'
import { FaGithub } from 'react-icons/fa'
import {
  Header,
  HeaderBody,
  HeaderTitle,
  HeaderPrimary,
  HeaderSecondaryLink,
  TabList,
  RouterTabItem,
  Text,
} from 'components'
import { Query } from 'containers/Apollo'
import { useRouter } from 'containers/Router'
import {
  RepositoryProvider,
  RepositoryContextFragment,
  useRepository,
} from './RepositoryContext'
import { RepositoryBuilds } from './Builds'
import { RepositorySettings } from './Settings'
import { BuildDetail } from './BuildDetail'
import { GettingStarted } from './GettingStarted'
import { NotFound } from '../NotFound'

function hasWritePermission(repository) {
  return repository.permissions.includes('write')
}

const RepoTitlePart = styled(Text)`
  margin: 0 2;
  color: white;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;

  a&:hover {
    text-decoration: underline;
  }
`

function RepositoryHeader() {
  const repository = useRepository()
  const { match } = useRouter()

  return (
    <Header>
      <HeaderBody>
        <HeaderPrimary>
          <HeaderTitle>
            <Box forwardedAs={GoRepo} display="block" mt="6rpx" />
            <RepoTitlePart forwardedAs={Link} to={`/${repository.owner.login}`}>
              {repository.owner.login}
            </RepoTitlePart>
            / <RepoTitlePart>{repository.name}</RepoTitlePart>
          </HeaderTitle>
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
          {repository.enabled ? (
            <RouterTabItem to={`${match.url}/builds`}>Builds</RouterTabItem>
          ) : null}
          {hasWritePermission(repository) ? (
            <RouterTabItem to={`${match.url}/settings`}>Settings</RouterTabItem>
          ) : null}
        </TabList>
      </HeaderBody>
    </Header>
  )
}

export function Repository({
  match: {
    url,
    params: { ownerLogin, repositoryName },
  },
}) {
  const location = useLocation()

  return (
    <Query
      query={gql`
        query Repository($ownerLogin: String!, $repositoryName: String!) {
          repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
            ...RepositoryContextFragment
          }
        }

        ${RepositoryContextFragment}
      `}
      variables={{ ownerLogin, repositoryName }}
      fetchPolicy="no-cache"
    >
      {({ repository }) => {
        if (!repository) {
          return <NotFound />
        }

        if (
          !repository.enabled &&
          location.pathname.indexOf('settings') === -1
        ) {
          return <Redirect push to={`${url}/settings`} />
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
                <Route
                  exact
                  path={`${url}/builds/:buildId(\\d+)`}
                  component={BuildDetail}
                />
                <Route
                  exact
                  path={`${url}/builds`}
                  component={RepositoryBuilds}
                />
                <Route
                  exact
                  path={`${url}/getting-started`}
                  component={GettingStarted}
                />
                {hasWritePermission(repository) ? (
                  <Route
                    exact
                    path={`${url}/settings`}
                    component={RepositorySettings}
                  />
                ) : null}
                <Route component={NotFound} />
              </Switch>
            </>
          </RepositoryProvider>
        )
      }}
    </Query>
  )
}
