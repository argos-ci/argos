import styled from '@xstyled/styled-components'

export const FadeLink = styled.aBox`
  transition: base;
  transition-property: opacity;
  text-decoration: none;

  &:hover {
    opacity: 0.75;
  }
`
