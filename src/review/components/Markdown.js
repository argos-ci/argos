import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Helmet } from 'react-helmet'
import LayoutBody from './LayoutBody'
import { Container } from './Container'

export function Markdown({ children, title }) {
  return (
    <LayoutBody variant="marginBottom">
      <Container p={0} my={4} color="light700">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <ReactMarkdown source={children} />
      </Container>
    </LayoutBody>
  )
}
