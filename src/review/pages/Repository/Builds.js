/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import gql from 'graphql-tag'
import { Helmet } from 'react-helmet'
import { Box } from '@xstyled/styled-components'
import { Query } from 'containers/Apollo'
import { Link } from 'react-router-dom'
import { FaRegClock } from 'react-icons/fa'
import { GoGitCommit } from 'react-icons/go'
import moment from 'moment'
import { Container, Card, CardBody, FadeLink } from 'components'
import { getBuildStatus, getStatusColor } from 'modules/build'
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
            repository(ownerLogin: $ownerLogin, name: $name) {
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
                  commit
                  branch
                  conclusion
                  jobStatus
                  commitInfo {
                    message
                    author {
                      avatarUrl
                      name
                      login
                    }
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
                const buildStatus = getBuildStatus(build)
                const buildColor = getStatusColor(buildStatus)
                return (
                  <Box col={1} py={2} key={build.id}>
                    <Card borderLeft={2} borderColor={buildColor}>
                      <CardBody p={2} fontSize={14}>
                        <Box row>
                          <Box col={{ xs: 2 / 6, md: 1 / 6 }}>
                            <FadeLink
                              forwardedAs={Link}
                              color={buildColor}
                              to={`/gh/${repository.owner.login}/${repository.name}/builds/${build.number}`}
                              display="flex"
                              alignItems="center"
                            >
                              <StatusIcon status={buildStatus} mr={2} />
                              {build.branch}
                            </FadeLink>
                            <Box mt={1} display="flex" alignItems="center">
                              <Box
                                forwardedAs="img"
                                borderRadius="base"
                                alt={build.commitInfo.author.name}
                                src={build.commitInfo.author.avatarUrl}
                                width={18}
                                height={18}
                                mr={2}
                              />
                              {build.commitInfo.author.name}
                            </Box>
                          </Box>
                          <Box
                            col={3 / 6}
                            display={{ xs: 'none', md: 'block' }}
                          >
                            {build.commitInfo.message}
                          </Box>
                          <Box col={{ xs: 2 / 6, md: 1 / 6 }}>
                            <FadeLink
                              forwardedAs={Link}
                              color={buildColor}
                              to={`/gh/${repository.owner.login}/${repository.name}/builds/${build.number}`}
                            >
                              #{build.number} {buildStatus}
                            </FadeLink>
                            <FadeLink
                              target="_blank"
                              rel="noopener noreferer"
                              href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.commit}`}
                              color="white"
                              display="flex"
                              alignItems="center"
                            >
                              <Box forwardedAs={GoGitCommit} mr={2} />
                              {build.commit.slice(0, 7)}
                            </FadeLink>
                          </Box>
                          <Box
                            col={{ xs: 2 / 6, md: 1 / 6 }}
                            display="flex"
                            alignItems="center"
                          >
                            <Box forwardedAs={FaRegClock} mr={2} />
                            {moment(build.createdAt).fromNow()}
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
