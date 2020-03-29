import React from 'react'
import styled from '@xstyled/styled-components'
import { Text, Box } from '@smooth-ui/core-sc'
import { LayoutBody } from './LayoutBody'

const HeaderContainer = styled.box`
  min-height: 300;
  display: flex;
  align-items: center;
  overflow: hidden;
  background-color: light200;
  color: light900;
`

export function ProductHeader({ beast, children, display1, headline }) {
  return (
    <HeaderContainer>
      <LayoutBody variant="margin">
        <Box zIndex={1} position="relative">
          <Text forwardedAs="h1">{display1}</Text>
          <Text variant="headline" forwardedAs="h2">
            {headline}
          </Text>
          {children}
        </Box>
        {beast}
      </LayoutBody>
    </HeaderContainer>
  )
}
