/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import gql from 'graphql-tag'
import { Helmet } from 'react-helmet'
import { Box } from '@xstyled/styled-components'
import Tooltip from 'react-tooltip'
import { Query } from 'containers/Apollo'
import { Link } from 'react-router-dom'
import { FaRegClock } from 'react-icons/fa'
import { GoGitCommit } from 'react-icons/go'
import moment from 'moment'
import { Container, Card, CardBody, FadeLink } from 'components'
import { getStatusColor } from 'modules/build'
import { StatusIcon } from 'containers/StatusIcon'
import { useRepository } from './RepositoryContext'
import { RepositoryEmpty } from './Empty'

export function RepositoryBuilds() {
  const repository = useRepository()
  return (
    <>
      <Helmet>
        <title>Builds</title>
      </Helmet>
      <Query
        query={gql`
          query RepositoryBuilds($ownerLogin: String!, $name: String!) {
            repository(ownerLogin: $ownerLogin, repositoryName: $name) {
              id
              builds(first: 50, after: 0) {
                pageInfo {
                  totalCount
                  hasNextPage
                  endCursor
                }
                edges {
                  id
                  createdAt
                  number
                  status
                  baseScreenshotBucket {
                    id
                    createdAt
                    updatedAt
                    name
                    commit
                    branch
                  }
                  compareScreenshotBucket {
                    id
                    createdAt
                    updatedAt
                    name
                    commit
                    branch
                  }
                }
              }
            }
          }
        `}
        variables={{
          ownerLogin: repository.owner.login,
          name: repository.name,
        }}
      >
        {({ repository: { builds } }) => {
          if (!builds.pageInfo.totalCount) {
            return <RepositoryEmpty />
          }
          return (
            <Container my={4}>
              {builds.edges.map(build => {
                const { status } = build
                console.log(status)
                const buildColor = getStatusColor(status)
                return (
                  <Box col={1} py={2} key={build.id}>
                    <Card borderLeft={2} borderColor={buildColor}>
                      <CardBody p={2} fontSize={14}>
                        <Box row>
                          <Box col={{ xs: 2 / 6, md: 1 / 6 }}>
                            <FadeLink
                              forwardedAs={Link}
                              color={buildColor}
                              to={`/${repository.owner.login}/${repository.name}/builds/${build.number}`}
                              display="flex"
                              alignItems="center"
                            >
                              <StatusIcon status={status} mr={2} />
                              {build.compareScreenshotBucket.branch}
                            </FadeLink>
                          </Box>
                          <Box col={{ xs: 2 / 6, md: 4 / 6 }}>
                            <FadeLink
                              forwardedAs={Link}
                              color={buildColor}
                              to={`/${repository.owner.login}/${repository.name}/builds/${build.number}`}
                            >
                              #{build.number} {status}
                            </FadeLink>
                            <FadeLink
                              target="_blank"
                              rel="noopener noreferer"
                              href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                              color="white"
                              display="flex"
                              alignItems="center"
                            >
                              <Box forwardedAs={GoGitCommit} mr={2} />
                              {build.compareScreenshotBucket.commit.slice(0, 7)}
                            </FadeLink>
                          </Box>
                          <Box
                            col={{ xs: 2 / 6, md: 1 / 6 }}
                            display="flex"
                            alignItems="center"
                          >
                            <Box
                              data-tip={moment(build.createdAt).format(
                                'DD-MM-YYYY HH:MM',
                              )}
                            >
                              <Box forwardedAs={FaRegClock} mr={2} />
                              {moment(build.createdAt).fromNow()}
                            </Box>
                            <Tooltip />
                          </Box>
                        </Box>
                      </CardBody>
                    </Card>
                  </Box>
                )
              })}
            </Container>
          )
        }}
      </Query>
    </>
  )
}
