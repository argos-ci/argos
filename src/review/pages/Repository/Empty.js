/* eslint-disable react/no-unescaped-entities */
import React from 'react'
import styled from '@xstyled/styled-components'
import {
  Container,
  Card,
  CardTitle,
  CardHeader,
  CardBody,
  CardText,
  FadeLink,
} from 'components'
import { useRepository } from './RepositoryContext'

const StyledLink = styled(FadeLink)`
  color: darker;
`

export function RepositoryEmpty() {
  const repository = useRepository()

  return (
    <Container my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Setup Argos on this project</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText>
            See{' '}
            <StyledLink
              href={`/${repository.owner.login}/${repository.name}/getting-started`}
            >
              Quick Start Guide
            </StyledLink>{' '}
            to learn how to setup the project.
          </CardText>
        </CardBody>
      </Card>
    </Container>
  )
}
