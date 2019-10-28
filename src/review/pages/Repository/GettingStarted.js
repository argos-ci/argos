import React from 'react'
import { Container, Card, CardTitle, CardBody } from 'components'
import { Button } from '@smooth-ui/core-sc'
import MarkdownElement from 'modules/components/MarkdownElement'
import gettingStarted from './getting-started.md'
import { useRepository } from './RepositoryContext'

export function GettingStarted() {
  const repository = useRepository()
  const text = gettingStarted.replace(/__ARGOS_TOKEN__/g, repository.token)

  return (
    <Container my={4}>
      <Card>
        <CardTitle variant="headline" gutterBottom>
          Getting started
        </CardTitle>

        <CardBody>
          <MarkdownElement text={text} disableAnchor />
          <Button
            as="a"
            href={`/${repository.owner.login}/${repository.name}/builds`}
          >
            {'Got it! Go to the Build Stream'}
          </Button>
        </CardBody>
      </Card>
    </Container>
  )
}
