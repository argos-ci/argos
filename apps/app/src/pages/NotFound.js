import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  FadeLink,
} from '../components'

export function NotFound() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Not found</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText>There is nothing to see here.</CardText>
          <CardText>
            <FadeLink forwardedAs={Link} color="darker" to="/">
              Back to home
            </FadeLink>
          </CardText>
        </CardBody>
      </Card>
    </Container>
  )
}
