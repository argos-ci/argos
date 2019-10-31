import React from 'react'
import styled from '@xstyled/styled-components'

const Pre = styled.pre`
  padding: 2 0;
  overflow-x: auto;
`

const InnerCode = styled.code`
  padding: 2;
  background-color: light100;
  border-radius: base;
  color: light800;
`

export function Code(props) {
  return (
    <Pre>
      <InnerCode {...props} />
    </Pre>
  )
}
