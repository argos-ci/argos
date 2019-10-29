import React from 'react'
import { Helmet } from 'react-helmet'
import { Boxer, Button } from '@smooth-ui/core-sc'
import configBrowser from 'configBrowser'
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
            <CardText>You can manage your permissions using this link</CardText>
            <Button
              as="a"
              target="_blank"
              rel="noopener noreferrer"
              href={configBrowser.get('github.applicationUrl')}
            >
              Manage permissions
            </Button>
          </CardBody>
        </Card>
      </Boxer>
    </Container>
  )
}
