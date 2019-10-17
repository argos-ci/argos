import React from 'react'
import styled from '@xstyled/styled-components'
import { Text, Box } from '@smooth-ui/core-sc'
import LayoutBody from 'components/LayoutBody'

const HeaderContainer = styled.box`
  min-height: 300;
  display: flex;
  align-items: center;
  overflow: hidden;
`

const ProductHeader = props => {
  const { beast, children, display1, headline } = props

  return (
    <HeaderContainer>
      <LayoutBody variant="margin">
        <Box zIndex={1} position="relative">
          <Text variant="h4" forwardedAs="h1">
            {display1}
          </Text>
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

export default ProductHeader
