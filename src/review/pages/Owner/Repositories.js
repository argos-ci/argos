import React from 'react'
import gql from 'graphql-tag'
import { Link } from 'react-router-dom'
import styled, { Box } from '@xstyled/styled-components'
import { Query } from 'containers/Apollo'
import { GoRepo } from 'react-icons/go'
import { getTotalAssetsSize } from 'modules/stats'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  FadeLink,
  FileSize,
} from 'components'
import { useOwner } from './OwnerContext'

const Stat = styled.div`
  display: flex;
`

const StatLabel = styled.span`
  flex: 1;
`
const StatValue = styled.span`
  flex: 0 0 auto;
  color: white;
`

export function RepositorySummary({ repository }) {
  if (!repository.overviewBuild) {
    return <div>No info to display</div>
  }
  const {
    bundle: { stats },
  } = repository.overviewBuild
  return (
    <Box>
      <Box row mx={-4}>
        <Box
          col={{ xs: 1, md: 1 / 4 }}
          px={4}
          borderRight={1}
          borderColor="gray600"
        >
          <Stat>
            <StatLabel>Total size</StatLabel>
            <StatValue>
              <FileSize>{getTotalAssetsSize(stats)}</FileSize>
            </StatValue>
          </Stat>
        </Box>
        <Box
          col={{ xs: 1, md: 1 / 4 }}
          px={4}
          borderRight={1}
          borderColor="gray600"
        >
          <Stat>
            <StatLabel>Chunks</StatLabel>
            <StatValue>{stats.chunksNumber}</StatValue>
          </Stat>
        </Box>
        <Box
          col={{ xs: 1, md: 1 / 4 }}
          px={4}
          borderRight={1}
          borderColor="gray600"
        >
          <Stat>
            <StatLabel>Modules</StatLabel>
            <StatValue>{stats.modulesNumber}</StatValue>
          </Stat>
        </Box>
        <Box col={{ xs: 1, md: 1 / 4 }} px={4}>
          <Stat>
            <StatLabel>Assets</StatLabel>
            <StatValue>{stats.assets.length}</StatValue>
          </Stat>
        </Box>
      </Box>
    </Box>
  )
}

const Title = styled.h3`
  font-size: 18;
  font-weight: medium;
`

function PassiveRepositories({ title, repositories }) {
  const owner = useOwner()
  if (!repositories.length) return null
  return (
    <>
      <Title>{title}</Title>
      {repositories.map(repository => (
        <Box col={1} py={2} key={repository.id}>
          <Card>
            <CardBody p={2} display="flex" alignItems="center">
              <Box as={GoRepo} color="white" mr={2} />
              <FadeLink
                forwardedAs={Link}
                color="white"
                to={`/gh/${owner.login}/${repository.name}`}
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
                active
                archived
                overviewBuild {
                  id
                  bundle {
                    id
                    stats {
                      assets {
                        name
                        size
                        gzipSize
                        brotliSize
                        chunkNames
                      }
                      chunksNumber
                      modulesNumber
                    }
                  }
                }
              }
            }
          }
        `}
        variables={{ login: owner.login }}
      >
        {({ owner: { repositories } }) => {
          if (!repositories.length) {
            return (
              <Container my={4} textAlign="center">
                No repository found for {owner.login}.
              </Container>
            )
          }
          const activeRepositories = repositories.filter(
            repository => repository.active && !repository.archived,
          )
          const inactiveRepositories = repositories.filter(
            repository => !repository.active && !repository.archived,
          )
          const archivedRepositories = repositories.filter(
            repository => repository.archived,
          )
          return (
            <Container my={4}>
              <Box row my={-2} justifyContent="center">
                {activeRepositories.map(repository => (
                  <Box col={1} py={2} key={repository.id}>
                    <Card>
                      <CardHeader display="flex" alignItems="center">
                        <Box as={GoRepo} color="white" mr={2} />
                        <FadeLink
                          forwardedAs={Link}
                          color="white"
                          to={`/gh/${owner.login}/${repository.name}`}
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
                  repositories={inactiveRepositories}
                />
                <PassiveRepositories
                  title="Archived repositories"
                  repositories={archivedRepositories}
                />
              </Box>
            </Container>
          )
        }}
      </Query>
    </>
  )
}
