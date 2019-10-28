import React from 'react'
import { Helmet } from 'react-helmet'
import { Boxer, Button } from '@smooth-ui/core-sc'
import configBrowser from 'configBrowser'
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
            <CardTitle>Manage permissions</CardTitle>
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
