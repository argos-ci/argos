import React from 'react'
import { Helmet } from 'react-helmet'
import gql from 'graphql-tag'
import { Route, Link, Switch } from 'react-router-dom'
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
import { BuildDetail } from './BuildDetail/index'
import { GettingStarted } from './GettingStarted'
import { NotFound } from '../NotFound'

function hasWritePermission(repository) {
  return repository.permissions.includes('write')
}

const RepoTitlePart = styled(Text)`
  margin: 0 2;
  color: darker;
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
          <RouterTabItem to={`${match.url}/builds`}>Builds</RouterTabItem>
          {hasWritePermission(repository) ? (
            <RouterTabItem to={`${match.url}/settings`}>Settings</RouterTabItem>
          ) : null}
        </TabList>
      </HeaderBody>
    </Header>
  )
}

const GET_REPOSITORY = gql`
  query Repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      ...RepositoryContextFragment
    }
  }

  ${RepositoryContextFragment}
`

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
          return <NotFound />
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
        )
      }}
    </Query>
  )
}
