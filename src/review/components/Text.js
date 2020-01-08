import React from 'react'
import styled, {
  css,
  system,
  createSystemComponent,
} from '@xstyled/styled-components'

function ellipsis({ lines, fontSize, lineHeight = 1.4 }) {
  if (lines === 'infinite') return null
  const height = (Math.round(fontSize * lineHeight) / 16) * lines
  return css`
    height: ${height}rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: ${lines};
  `
}

const InnerText = styled(createSystemComponent(React, 'div', system))`
  margin: 0;
  line-height: 1.4;
  ${ellipsis}
  ${system}
`

export function Text({ as, lines = 1, ...props }) {
  return <InnerText forwardedAs={as} lines={lines} {...props} />
}
