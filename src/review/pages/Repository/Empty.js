/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import { Box } from '@xstyled/styled-components'
import {
  Container,
  Card,
  Code,
  CardBody,
  CardTitle,
  CardText,
  FadeLink,
} from 'components'
import { hasWritePermission } from 'modules/permissions'
import { useRepository } from './RepositoryContext'

export function RepositoryEmpty() {
  const repository = useRepository()
  const write = hasWritePermission(repository)
  if (!write) {
    return (
      <Container textAlign="center" my={4}>
        There is no build for this repository.
      </Container>
    )
  }
  return (
    <Container textAlign="center" my={4}>
      <Card>
        <CardBody>
          <CardTitle>Setup Bundle Analyzer on this project</CardTitle>
          <CardText>
            See{' '}
            <FadeLink
              color="white"
              href="https://docs.bundle-analyzer.com/docs/quick-start/"
              target="_blanl"
              rel="noopener noreferrer"
            >
              Quick Start Guide
            </FadeLink>{' '}
            to learn how to setup the project.
          </CardText>
          <Box overflow="auto">
            <Code>BUNDLE_ANALYZER_TOKEN={repository.token}</Code>
          </Box>
        </CardBody>
      </Card>
    </Container>
  )
}
