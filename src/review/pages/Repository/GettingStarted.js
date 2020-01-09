import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Container, Card, CardHeader, CardTitle, CardBody } from 'components'
import gettingStarted from './getting-started.md'
import { useRepository } from './RepositoryContext'
import { ToggleButton } from './ToggleButton'

export function GettingStarted() {
  const repository = useRepository()
  const text = gettingStarted.replace(/__ARGOS_TOKEN__/g, repository.token)

  return (
    <Container my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        {!repository.enabled ? (
          <CardBody pt={0}>
            <p>To start, first activate your repository.</p>
            <ToggleButton />
          </CardBody>
        ) : (
          <CardBody py={0}>
            <ReactMarkdown>{text}</ReactMarkdown>
          </CardBody>
        )}
      </Card>
    </Container>
  )
}
