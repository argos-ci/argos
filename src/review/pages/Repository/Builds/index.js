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
import {
  Container,
  Card,
  CardBody,
  FadeLink,
  Loader,
  AlertBar,
  AlertBarBody,
} from 'components'
import { getStatusColor } from 'modules/build'
import { StatusIcon } from 'containers/StatusIcon'
import { useRepository } from '../RepositoryContext'
import { ListProvider, useBuilds, useLoadMore } from './Context'
import { RepositoryEmpty } from './Empty'

const ListBuilds = ({ repository }) => {
  const { builds, pageInfo, loading, error } = useBuilds()
  const loadMore = useLoadMore()

  if (!loading && pageInfo && !pageInfo.totalCount) {
    return <RepositoryEmpty />
  }

  return (
    <Container my={4}>
      {!loading && error ? (
        <AlertBar role="alert">
          <AlertBarBody>
            <Box row alignItems="center">
              <Box as="p" col={{ xs: 1, md: true }}>
                An error happened while loading the builds.
              </Box>
              <Box col={{ xs: 1, md: 'auto' }}>
                <Button onClick={() => window.location.reload()}>
                  Reload the page
                </Button>
              </Box>
            </Box>
          </AlertBarBody>
        </AlertBar>
      ) : (
        <>
          {builds.map(build => {
            const { status } = build

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
                          to={`/${repository.owner.login}/${repository.name}/builds/${build.id}`}
                        >
                          #{build.number} {status}
                        </FadeLink>
                        <FadeLink
                          target="_blank"
                          rel="noopener noreferer"
                          href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                          color="darker"
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
          {pageInfo && pageInfo.hasNextPage && (
            <Button
              mt={2}
              onClick={() => loadMore(pageInfo.endCursor)}
              disabled={loading}
            >
              Load More
            </Button>
          )}
          {loading && (
            <Box textAlign="center">
              <Loader />
            </Box>
          )}
        </>
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
      <ListProvider repository={repository}>
        <ListBuilds repository={repository} />
      </ListProvider>
    </>
  )
}
