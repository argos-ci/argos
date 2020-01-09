/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import { Helmet } from 'react-helmet'
import { Box } from '@xstyled/styled-components'
import { Button } from '@smooth-ui/core-sc'
import Tooltip from 'react-tooltip'
import { Link } from 'react-router-dom'
import { FaRegClock } from 'react-icons/fa'
import { GoGitCommit } from 'react-icons/go'
import moment from 'moment'
import gql from 'graphql-tag'
import { getStatusColor } from 'modules/build'
import { Container, Card, CardBody, FadeLink, Loader } from '../../components'
import { StatusIcon } from '../../containers/StatusIcon'
import { useRepository } from './RepositoryContext'
import { useQuery } from '../../containers/Apollo'
import { GettingStarted } from './GettingStarted'

const REPOSITORY_BUILDS = gql`
  query RepositoryBuilds($ownerLogin: String!, $name: String!, $after: Int!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $name) {
      id
      builds(first: 5, after: $after) {
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
`

function BuildsList({ repository }) {
  const { loading, data, fetchMore } = useQuery(REPOSITORY_BUILDS, {
    variables: {
      ownerLogin: repository.owner.login,
      name: repository.name,
      after: 0,
    },
  })
  const [moreLoading, setMoreLoading] = React.useState()

  function loadNextPage() {
    setMoreLoading(true)
    fetchMore({
      variables: { after: data.repository.builds.pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          ...prev,
          repository: {
            ...prev.repository,
            builds: {
              ...fetchMoreResult.repository.builds,
              edges: [
                ...prev.repository.builds.edges,
                ...fetchMoreResult.repository.builds.edges,
              ],
            },
          },
        }
      },
    }).finally(() => {
      setMoreLoading(false)
    })
  }

  if (loading) {
    return (
      <Container my={4} textAlign="center">
        <Loader />
      </Container>
    )
  }

  const {
    repository: {
      builds: { pageInfo, edges: builds },
    },
  } = data

  if (!pageInfo.totalCount) {
    return <GettingStarted />
  }

  return (
    <Container my={4}>
      {builds.map(build => {
        const { status } = build
        const buildColor = getStatusColor(status)
        return (
          <Box key={build.id} col={1} py={2}>
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
                    <div>
                      <FadeLink
                        forwardedAs={Link}
                        color={buildColor}
                        to={`/${repository.owner.login}/${repository.name}/builds/${build.id}`}
                      >
                        #{build.number} {status}
                      </FadeLink>
                    </div>
                    <div>
                      <FadeLink
                        target="_blank"
                        rel="noopener noreferer"
                        href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                        color="darker"
                        display="inline-flex"
                        alignItems="center"
                      >
                        <Box forwardedAs={GoGitCommit} mr={2} />
                        {build.compareScreenshotBucket.commit.slice(0, 7)}
                      </FadeLink>
                    </div>
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
      {pageInfo.hasNextPage && !moreLoading ? (
        <Button
          mt={3}
          mx="auto"
          variant="gray800"
          textAlign="center"
          display="block"
          width={200}
          fontSize={12}
          onClick={loadNextPage}
        >
          Load More
        </Button>
      ) : null}
      {moreLoading && (
        <Box my={3} textAlign="center">
          <Loader />
        </Box>
      )}
    </Container>
  )
}

export function RepositoryBuilds() {
  const repository = useRepository()

  return (
    <>
      <Helmet>
        <title>Builds</title>
      </Helmet>
      <BuildsList repository={repository} />
    </>
  )
}
