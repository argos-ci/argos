import React from 'react'
import { Helmet } from 'react-helmet'
import { Boxer, Button } from '@smooth-ui/core-sc'
import config from '../../config'
import {
  Container,
  Card,
  CardBody,
  CardHeader,
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
          <CardHeader>
            <CardTitle>Manage permissions</CardTitle>
          </CardHeader>
          <CardBody>
            <CardText mt={0}>
              For now, Argos uses OAuth GitHub App, you can’t manage permission
              per repository but you can block the entire access to Argos using
              the following link.
            </CardText>
            <Button
              as="a"
              target="_blank"
              rel="noopener noreferrer"
              href={config.get('github.appUrl')}
            >
              Manage permissions
            </Button>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  )
}
