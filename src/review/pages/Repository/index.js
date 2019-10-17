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
import { RepositoryOverview } from './Overview'
import { RepositoryBuilds } from './Builds'
import { RepositorySettings } from './Settings'
import { BuildDetail } from './BuildDetail'
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
            <RepoTitlePart
              forwardedAs={Link}
              to={`/gh/${repository.owner.login}`}
            >
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
          <RouterTabItem exact to={match.url}>
            Overview
          </RouterTabItem>
          <RouterTabItem to={`${match.url}/builds`}>Builds</RouterTabItem>
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
  return (
    <Query
      query={gql`
        query Repository($ownerLogin: String!, $name: String!) {
          repository(ownerLogin: $ownerLogin, name: $name) {
            ...RepositoryContextFragment
          }
        }

        ${RepositoryContextFragment}
      `}
      variables={{ ownerLogin, name: repositoryName }}
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
                <Route exact path={url} component={RepositoryOverview} />
                <Route
                  exact
                  path={`${url}/builds/:buildNumber(\\d+)`}
                  component={BuildDetail}
                />
                <Route
                  exact
                  path={`${url}/builds`}
                  component={RepositoryBuilds}
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
