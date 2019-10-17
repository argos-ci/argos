import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { Container, FadeLink } from 'components'

export function NotFound() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Not found</title>
      </Helmet>
      <p>There is nothing to see here.</p>
      <p>
        <FadeLink forwardedAs={Link} color="white" to="/">
          Back to home
        </FadeLink>
      </p>
    </Container>
  )
}
