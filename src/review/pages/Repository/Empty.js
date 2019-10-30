/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import styled, { Box, css } from '@xstyled/styled-components'
import { up } from '@xstyled/system'
import { Text, Button } from '@smooth-ui/core-sc'
import {
  Container,
  Card,
  CardTitle,
  CardHeader,
  CardBody,
  FadeLink,
} from 'components'
import Beast from 'components/Beast'
import { useRepository } from './RepositoryContext'

const StyledBeast = styled(Beast)`
  position: relative;
  width: 100rpx;
  height: 80rpx;
  fill: white;

  ${up(
    'md',
    css`
      margin-top: 20rpx;
    `,
  )}
`

export function RepositoryEmpty() {
  const repository = useRepository()

  return (
    <Container my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Waiting for screenshots...</CardTitle>
        </CardHeader>
        <CardBody>
          <Box row mx={-3}>
            <Box col={{ xs: 1, md: 1 / 3 }} px={3} textAlign="center">
              <StyledBeast width={100} />
            </Box>
            <Box col={{ xs: 1, md: 2 / 3 }} px={3}>
              <Text as="p" mb={2}>
                Our screenshot beast is waiting to scan your first screenshots.
              </Text>
              <p>
                <Button
                  as="a"
                  href={`/${repository.owner.login}/${repository.name}/getting-started`}
                >
                  Installation Instructions
                </Button>
              </p>
              <FadeLink
                href={`/${repository.owner.login}/${repository.name}/builds/${repository.sampleBuildId}?sample`}
                color="white"
              >
                Or see a sample build
              </FadeLink>
            </Box>
          </Box>
        </CardBody>
      </Card>
    </Container>
  )
}
