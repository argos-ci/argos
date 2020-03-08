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
  Loader,
} from 'components'
import moment from 'moment'
import { useQuery } from 'containers/Apollo'
import { FaRegClock } from 'react-icons/fa'
import { GoGitCommit, GoGitBranch, GoPulse } from 'react-icons/go'
import { getStatusColor } from 'modules/build'
import { StatusIcon } from 'containers/StatusIcon'
import BuildDetailScreenshots from './Screenshots'
import BuildDetailAction from './Action'
import { BuildProvider, BuildContextFragment, useBuild } from './Context'
// eslint-disable-next-line import/no-cycle
import { NotFound } from '../../NotFound'
import { useRepository } from '../RepositoryContext'

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
            <CardBody overflow="hidden">
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
  query Build(
    $buildNumber: Int!
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        id
        number
        ...BuildContextFragment
      }
    }
  }

  ${BuildContextFragment}
`

export function BuildDetail() {
  const repository = useRepository()
  const { buildNumber } = useParams()
  const { loading, data } = useQuery(BUILD_QUERY, {
    variables: {
      ownerLogin: repository.owner.login,
      repositoryName: repository.name,
      buildNumber: Number(buildNumber),
    },
  })
  if (loading)
    return (
      <Container my={4} textAlign="center">
        <Loader />
      </Container>
    )
  if (!data.repository || !data.repository.build) return <NotFound />

  const { build } = data.repository
  return (
    <>
      <Helmet>
        <title>{`Build #${build.number}`}</title>
      </Helmet>
      <BuildProvider build={build}>
        <Build />
      </BuildProvider>
    </>
  )
}
