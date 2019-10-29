import React from 'react'
import { Boxer, Alert, Button } from '@smooth-ui/core-sc'
import { Helmet } from 'react-helmet'
import {
  Container,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardText,
  Code,
  FadeLink,
} from '../../components'
import { useRepository, useToggleRepository } from './RepositoryContext'

export function RepositorySettings() {
  const repository = useRepository()
  const { toggleRepository, loading, error } = useToggleRepository()
  const { owner, enabled } = repository
  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <Boxer my={4}>
        {enabled && (
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardBody>
              <CardText>
                To send data to Argos-ci you will need to configure a{' '}
                <FadeLink
                  href="https://github.com/argos-ci/argos-cli"
                  target="_blank"
                  color="white"
                >
                  CLI
                </FadeLink>{' '}
                with a client key (usually referred to as the ARGOS_TOKEN
                value).
                <br />
                ARGOS_TOKEN is a project-specific, it should be kept secret.
                <br />
                For more information on integrating Argos CI with your
                application take a look at our{' '}
                <FadeLink
                  color="white"
                  href={`/${owner.login}/${repository.name}/getting-started`}
                  variant="primary"
                >
                  documentation.
                </FadeLink>
              </CardText>
              <Code>ARGOS_TOKEN={repository.token}</Code>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              {enabled ? 'Deactivate' : 'Activate'} Repository
            </CardTitle>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert variant="danger">
                Something went wrong. Please try again.
              </Alert>
            )}

            <CardText>
              <Button
                disabled={loading}
                variant={enabled ? 'danger' : 'success'}
                onClick={() =>
                  toggleRepository({
                    variables: {
                      enabled: !repository.enabled,
                      repositoryId: repository.id,
                    },
                  })
                }
              >
                {enabled ? 'Deactivate' : 'Activate'} Repository
              </Button>
            </CardText>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  )
}
