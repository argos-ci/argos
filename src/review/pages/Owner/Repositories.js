import React from 'react'
import gql from 'graphql-tag'
import { Link } from 'react-router-dom'
import styled, { Box, th } from '@xstyled/styled-components'
import { Query } from 'containers/Apollo'
import Tooltip from 'react-tooltip'
import { GoRepo } from 'react-icons/go'
import { StatusIcon } from 'containers/StatusIcon'
import moment from 'moment'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  FadeLink,
  Text,
} from 'components'
import { getStatusColor } from 'modules/build'
import { useOwner } from './OwnerContext'

const Stat = styled.div`
  display: flex;
`

const StatLabel = styled.span`
  flex: 1;
`
const StatValue = styled.span`
  flex: 0 0 auto;
  color: ${p => th.color(p.color || 'darker')};
`

export function RepositorySummary({ repository }) {
  const owner = useOwner()
  if (
    !repository.builds ||
    !repository.builds.edges ||
    repository.builds.edges.length === 0
  ) {
    return <div>No info to display</div>
  }
  const { pageInfo, edges } = repository.builds
  const [latestBuild] = edges
  const buildColor = getStatusColor(latestBuild.status)
  return (
    <Box>
      <Box row mx={-3}>
        <Box
          col={{ xs: 1, md: 1 / 3 }}
          px={3}
          borderRight={1}
          borderColor="light400"
        >
          <Stat>
            <StatLabel>Total builds</StatLabel>
            <StatValue>{pageInfo.totalCount}</StatValue>
          </Stat>
        </Box>
        <Box
          col={{ xs: 1, md: 1 / 3 }}
          px={3}
          borderRight={1}
          borderColor="light400"
        >
          <Stat>
            <StatLabel>
              <FadeLink
                forwardedAs={Link}
                color="inherit"
                to={`/${owner.login}/${repository.name}/builds/${latestBuild.number}`}
              >
                Latest build
              </FadeLink>
            </StatLabel>
            <StatValue
              data-tip={moment(latestBuild.createdAt).format(
                'DD-MM-YYYY HH:MM',
              )}
            >
              {moment(latestBuild.createdAt).fromNow()}
            </StatValue>
            <Tooltip />
          </Stat>
        </Box>
        <Box col={{ xs: 1, md: 1 / 3 }} px={3} borderColor="light400">
          <Stat>
            <StatLabel>
              <FadeLink
                color="inherit"
                forwardedAs={Link}
                to={`/${owner.login}/${repository.name}/builds/${latestBuild.number}`}
              >
                Latest build
              </FadeLink>{' '}
              status
            </StatLabel>
            <StatValue color={buildColor}>
              <StatusIcon
                verticalAlign="text-bottom"
                status={latestBuild.status}
                mr={2}
              />
              {latestBuild.status}
            </StatValue>
          </Stat>
        </Box>
      </Box>
    </Box>
  )
}

function PassiveRepositories({ title, repositories }) {
  const owner = useOwner()
  if (!repositories.length) return null
  return (
    <>
      <Text variant="h2">{title}</Text>
      {repositories.map(repository => (
        <Box col={1} py={2} key={repository.id}>
          <Card>
            <CardBody p={2} display="flex" alignItems="center">
              <Box as={GoRepo} color="darker" mr={2} />
              <FadeLink
                forwardedAs={Link}
                color="darker"
                to={`/${owner.login}/${repository.name}/builds`}
              >
                {repository.name}
              </FadeLink>
            </CardBody>
          </Card>
        </Box>
      ))}
    </>
  )
}

export function OwnerRepositories() {
  const owner = useOwner()
  return (
    <>
      <Query
        query={gql`
          query OwnerRepositories($login: String!) {
            owner(login: $login) {
              id
              repositories {
                id
                name
                enabled
                builds(first: 1, after: 0) {
                  pageInfo {
                    totalCount
                  }
                  edges {
                    id
                    createdAt
                    status
                    number
                  }
                }
              }
            }
          }
        `}
        variables={{ login: owner.login }}
        fetchPolicy="no-cache"
      >
        {({ owner: { repositories } }) => {
          if (!repositories.length) {
            return (
              <Container my={4} textAlign="center">
                No repository found for {owner.login}.
              </Container>
            )
          }
          const enabledRepositories = repositories.filter(
            repository => repository.enabled,
          )
          const unenabledRepositories = repositories.filter(
            repository => !repository.enabled,
          )
          return (
            <Container my={4}>
              <Box row my={-2} justifyContent="center">
                {enabledRepositories.map(repository => (
                  <Box col={1} py={2} key={repository.id}>
                    <Card>
                      <CardHeader display="flex" alignItems="center">
                        <Box as={GoRepo} color="darker" mr={2} />
                        <FadeLink
                          forwardedAs={Link}
                          color="darker"
                          to={`/${owner.login}/${repository.name}/builds`}
                        >
                          <CardTitle>{repository.name}</CardTitle>
                        </FadeLink>
                      </CardHeader>
                      <CardBody>
                        <RepositorySummary repository={repository} />
                      </CardBody>
                    </Card>
                  </Box>
                ))}
                <PassiveRepositories
                  title="Inactive repositories"
                  repositories={unenabledRepositories}
                />
              </Box>
            </Container>
          )
        }}
      </Query>
    </>
  )
}
