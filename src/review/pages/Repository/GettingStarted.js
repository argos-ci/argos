import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Container, Card, CardHeader, CardTitle, CardBody } from 'components'
import { Button } from '@smooth-ui/core-sc'
import gettingStarted from './getting-started.md'
import { useRepository } from './RepositoryContext'

export function GettingStarted() {
  const repository = useRepository()
  const text = gettingStarted.replace(/__ARGOS_TOKEN__/g, repository.token)

  return (
    <Container my={4}>
      <Card>
        <CardHeader>
          <CardTitle variant="headline" gutterBottom>
            Getting started
          </CardTitle>
        </CardHeader>

        <CardBody>
          <ReactMarkdown>{text}</ReactMarkdown>
          <Button
            as="a"
            href={`/${repository.owner.login}/${repository.name}/builds`}
          >
            Got it! Go to the Build Stream
          </Button>
        </CardBody>
      </Card>
    </Container>
  )
}
