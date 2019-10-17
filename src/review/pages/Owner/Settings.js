import React from 'react'
import { Helmet } from 'react-helmet'
import { Boxer, Button } from '@smooth-ui/core-sc'
import {
  Container,
  Card,
  CardBody,
  CardTitle,
  CardText,
} from '../../components'

export function OwnerSettings() {
  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>
      <Boxer my={4}>
        <Card>
          <CardBody>
            <CardTitle>GitHub Integration</CardTitle>
            <CardText>This account is configured via the GitHub App.</CardText>
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
        <Card>
          <CardBody>
            <CardTitle>Collaborators</CardTitle>
            <CardText>
              Bundle Analyzer uses GitHub permissions to authenticate users. No
              setup necessary.Ask your team members to simply login to Bundle
              Analyzer and they will have read/write access to the appropriate
              repositories.
            </CardText>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  )
}
