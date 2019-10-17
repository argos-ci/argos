import React from 'react'
import { Box, Boxer, Button, Input, Textarea } from '@smooth-ui/core-sc'
import { Helmet } from 'react-helmet'
import { FaCheck, FaTimes } from 'react-icons/fa'
import * as Sentry from '@sentry/browser'
import {
  Container,
  Card,
  CardBody,
  CardTitle,
  CardText,
  Code,
  FadeLink,
} from '../../components'
import { useRepository, useUpdateRepository } from './RepositoryContext'

function SmallAlert({ variant, ...props }) {
  switch (variant) {
    case 'updated':
      return (
        <Box
          role="alert"
          fontSize={12}
          display="flex"
          alignItems="center"
          {...props}
        >
          <Box forwardedAs={FaCheck} color="success" mr={1} />
          Saved
        </Box>
      )
    case 'error':
      return (
        <Box
          role="alert"
          fontSize={12}
          display="flex"
          alignItems="center"
          {...props}
        >
          <Box forwardedAs={FaTimes} color="danger" mr={1} />
          Error
        </Box>
      )
    default:
      return null
  }
}

function BaselineBranch() {
  const repository = useRepository()
  const updateRepository = useUpdateRepository()
  const [updated, setUpdated] = React.useState(false)
  const [baselineBranch, setBaselineBranch] = React.useState(
    repository.baselineBranch,
  )

  return (
    <Card>
      <CardBody>
        <CardTitle>Baseline branch</CardTitle>
        <CardText>
          The baseline branch is the branch displayed on overview.
        </CardText>
        <Box display="flex" alignItems="center">
          <Input
            value={baselineBranch}
            onChange={event => {
              setBaselineBranch(event.target.value)
              updateRepository({
                variables: {
                  repository: {
                    id: repository.id,
                    baselineBranch: event.target.value,
                  },
                },
              })
                .then(() => setUpdated(true))
                .catch(error => Sentry.captureException(error))
            }}
            maxWidth={200}
          />
          {updated ? <SmallAlert ml={2} variant="updated" /> : null}
        </Box>
      </CardBody>
    </Card>
  )
}

function Archive() {
  const repository = useRepository()
  const updateRepository = useUpdateRepository()

  if (!repository.active) return null

  return (
    <Card>
      <CardBody>
        <CardTitle>Archive project</CardTitle>
        <CardText>
          When your project is archived, it is still accessible but not shown on
          the homepage.
        </CardText>
        <Button
          onClick={() => {
            updateRepository({
              variables: {
                repository: {
                  id: repository.id,
                  archived: !repository.archived,
                },
              },
            }).catch(error => {
              Sentry.captureException(error)
            })
          }}
          variant="primary"
        >
          {repository.archived ? 'Unarchive project' : 'Archive project'}
        </Button>
      </CardBody>
    </Card>
  )
}

function SizeCheck() {
  const repository = useRepository()
  const updateRepository = useUpdateRepository()
  const [config, setConfig] = React.useState(repository.config)
  const [updated, setUpdated] = React.useState(false)
  const [error, setError] = React.useState(false)

  return (
    <Card>
      <CardBody>
        <CardTitle>Configuration</CardTitle>
        <CardText>
          Default project configuration.
          <FadeLink
            href="https://docs.bundle-analyzer.com/project-configuration"
            rel="noopener noreferrer"
            color="white"
          >
            Read documentation to know more about project config
          </FadeLink>
          .
        </CardText>
        <Textarea
          value={config}
          onChange={event => {
            const { value } = event.target
            setConfig(value)
            setError(false)
            updateRepository({
              variables: {
                repository: {
                  id: repository.id,
                  config: value,
                },
              },
            })
              .then(() => setUpdated(true))
              .catch(error => {
                setError(true)
                if (!error.message.match(/Invalid config/)) {
                  Sentry.captureException(error)
                }
              })
          }}
          rows={10}
        />
        {error ? (
          <SmallAlert mt={2} variant="error" />
        ) : updated ? (
          <SmallAlert mt={2} variant="updated" />
        ) : null}
      </CardBody>
    </Card>
  )
}

export function RepositorySettings() {
  const repository = useRepository()
  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <Boxer my={4}>
        <Card>
          <CardBody>
            <CardTitle>Project token</CardTitle>
            <CardText>See the docs for how to set up project.</CardText>
            <Code>BUNDLE_ANALYZER_TOKEN={repository.token}</Code>
          </CardBody>
        </Card>
        <BaselineBranch />
        <SizeCheck />
        <Archive />
        <Card>
          <CardBody>
            <CardTitle>Delete project</CardTitle>
            <CardText>
              To delete project, remove the access from your GitHub app.
            </CardText>
            <Button
              as="a"
              target="_blank"
              rel="noopener noreferrer"
              href={process.env.GITHUB_APP_URL}
            >
              Continue to GitHub to manage repository integration
            </Button>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  )
}
