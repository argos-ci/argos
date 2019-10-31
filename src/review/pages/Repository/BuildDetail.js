/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import gql from 'graphql-tag'
import { useParams } from 'react-router-dom'
import Tooltip from 'react-tooltip'
import styled, { Box } from '@xstyled/styled-components'
import { Helmet } from 'react-helmet'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  FadeLink,
} from 'components'
import moment from 'moment'
import { useQuery } from 'containers/Apollo'
import { FaRegClock } from 'react-icons/fa'
import { GoGitCommit, GoGitBranch, GoPulse } from 'react-icons/go'
import { getStatusColor } from 'modules/build'
import { StatusIcon } from 'containers/StatusIcon'
import BuildDetailScreenshots from './BuildDetailScreenshots'
import BuildDetailAction from './BuildDetailAction'
import { BuildProvider, BuildContextFragment, useBuild } from './BuildContext'
// eslint-disable-next-line import/no-cycle
import { NotFound } from '../NotFound'

const StyledCardHeader = styled(CardHeader)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

export function Build() {
  const build = useBuild()
  const { status } = build
  const buildColor = getStatusColor(status)

  return (
    <Container my={4} position="relative">
      <Box row m={-2}>
        <Box col={1} p={2}>
          <Card borderLeft={2} borderColor={buildColor}>
            <StyledCardHeader>
              <CardTitle>Summary</CardTitle>
              <BuildDetailAction build={build} />
            </StyledCardHeader>
            <CardBody>
              <Box row>
                <Box col="auto">
                  <StatusIcon status={status} mt={1} mr={2} />
                </Box>
                <Box col>
                  <Box row>
                    <Box col>
                      <Box
                        color={buildColor}
                        display="flex"
                        alignItems="center"
                      >
                        <Box forwardedAs="strong" mr={2}>
                          {build.compareScreenshotBucket.branch}
                        </Box>
                        <Box>{build.compareScreenshotBucket.commit}</Box>
                      </Box>
                      <Box mt={3}>
                        <FadeLink
                          target="_blank"
                          rel="noopener noreferer"
                          href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                          color="darker"
                          display="flex"
                          alignItems="center"
                        >
                          <Box forwardedAs={GoGitCommit} mr={2} />
                          Commit{' '}
                          {build.compareScreenshotBucket.commit.slice(0, 7)}
                        </FadeLink>
                        <FadeLink
                          target="_blank"
                          rel="noopener noreferer"
                          href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/tree/${build.compareScreenshotBucket.branch}`}
                          color="darker"
                          display="flex"
                          alignItems="center"
                        >
                          <Box forwardedAs={GoGitBranch} mr={2} />
                          Branch {build.compareScreenshotBucket.branch}
                        </FadeLink>
                      </Box>
                    </Box>
                    <Box col={{ xs: 1, md: 'auto' }} mt={{ xs: 3, md: 0 }}>
                      <Box
                        color={buildColor}
                        display="flex"
                        alignItems="center"
                      >
                        <Box forwardedAs={GoPulse} mr={2} />
                        <span>
                          #{build.number} {status}
                        </span>
                      </Box>
                      <Box
                        mt={3}
                        display="flex"
                        alignItems="center"
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
                </Box>
              </Box>
            </CardBody>
          </Card>
        </Box>
      </Box>
      {build.screenshotDiffs.length === 0 ? (
        <Box row m={-2}>
          <Box col={1} p={2}>
            <Card>
              <CardHeader>
                <CardTitle>Screenshots</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText>No screenshot found.</CardText>
              </CardBody>
            </Card>
          </Box>
        </Box>
      ) : (
        <BuildDetailScreenshots build={build} />
      )}
    </Container>
  )
}

const BUILD_QUERY = gql`
  query Build($id: ID!) {
    build(id: $id) {
      ...BuildContextFragment
    }
  }

  ${BuildContextFragment}
`

export function BuildDetail() {
  const { buildId } = useParams()
  const { loading, data: { build } = {} } = useQuery(BUILD_QUERY, {
    variables: {
      id: Number(buildId),
    },
  })
  return (
    <>
      <Helmet>
        <title>{`Build #${buildId}`}</title>
      </Helmet>
      {build && !loading ? (
        <BuildProvider build={build}>
          <Build />
        </BuildProvider>
      ) : (
        <NotFound />
      )}
    </>
  )
}
