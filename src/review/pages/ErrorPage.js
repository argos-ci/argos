import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { Container, FadeLink } from 'components'

export function ErrorPage() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Error</title>
      </Helmet>
      <p>Sorry an error occurs.</p>
      <p>
        <FadeLink forwardedAs={Link} color="darker" to="/">
          Back to home
        </FadeLink>
      </p>
    </Container>
  )
}
