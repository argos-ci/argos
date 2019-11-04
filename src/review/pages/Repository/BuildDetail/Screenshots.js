/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import styled, { Box } from '@xstyled/styled-components'
import { Button } from '@smooth-ui/core-sc'
import { Card, CardHeader, CardTitle, CardBody, CardText } from 'components'
import { useHiddenState, Hidden, HiddenDisclosure } from 'reakit/Hidden'
import { getStatusColor } from 'modules/build'
import configBrowser from 'configBrowser'

function getS3Url(s3Id) {
  return `https://${configBrowser.get(
    's3.screenshotsBucket',
  )}.s3.amazonaws.com/${s3Id}`
}

const StyledImg = styled.img`
  width: 100%;
  display: block;
`

function ScreenshotDiffItem({
  jobStatus,
  score,
  compareScreenshot,
  baseScreenshot,
  s3Id,
  validationStatus,
}) {
  const hidden = useHiddenState({
    visible: validationStatus !== 'accepted',
  })
  let status = jobStatus
  if (jobStatus === 'complete') {
    status = score === 0 ? 'success' : 'unknown'
  }

  return (
    <CardBody borderLeft={2} borderColor={getStatusColor(status)}>
      <CardText as="h4">
        <HiddenDisclosure as={Button} {...hidden} mr={20}>
          {hidden.visible ? 'Hide' : 'Show'}
        </HiddenDisclosure>
        {compareScreenshot.name}
      </CardText>
      <Hidden {...hidden}>
        {() =>
          hidden.visible && (
            <Box row>
              <Box col={1 / 3}>
                {baseScreenshot ? (
                  <a
                    href={getS3Url(baseScreenshot.s3Id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <StyledImg
                      alt={baseScreenshot.name}
                      src={getS3Url(baseScreenshot.s3Id)}
                    />
                  </a>
                ) : null}
              </Box>
              <Box col={1 / 3}>
                <a
                  href={getS3Url(compareScreenshot.s3Id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <StyledImg
                    alt={compareScreenshot.name}
                    src={getS3Url(compareScreenshot.s3Id)}
                  />
                </a>
              </Box>
              <Box col={1 / 3}>
                {s3Id && (
                  <a
                    href={getS3Url(s3Id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <StyledImg alt="diff" src={getS3Url(s3Id)} />
                  </a>
                )}
              </Box>
            </Box>
          )
        }
      </Hidden>
    </CardBody>
  )
}

export default function BuildDetailScreenshots({ build }) {
  const { screenshotDiffs } = build
  screenshotDiffs.sort((itemA, itemB) =>
    itemA.validationStatus > itemB.validationStatus
      ? -1
      : itemA.validationStatus < itemB.validationStatus
      ? 1
      : 0,
  )

  return (
    <Box row m={-2}>
      <Box col={1} p={2}>
        <Card>
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          {screenshotDiffs.map((screenshotDiff, index) => (
            <ScreenshotDiffItem key={index} {...screenshotDiff} />
          ))}
        </Card>
      </Box>
    </Box>
  )
}
