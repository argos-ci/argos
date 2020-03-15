import React from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { Container, FadeLink } from '../components'

export function Documentation() {
  return (
    <Container textAlign="center" my={4}>
      <Helmet>
        <title>Documentation</title>
      </Helmet>
      <p>This is work in progress...</p>
      <p>
        <FadeLink forwardedAs={Link} color="darker" to="/">
          Back to home
        </FadeLink>
      </p>
    </Container>
  )
}
