import styled from '@xstyled/styled-components'
import NextLink from 'next/link'

const InnerLink = styled.box`
  cursor: pointer;
  color: white;
  transition: 300ms;

  &:hover {
    color: secondary;
  }
`

export const Link = ({ children, href, ...props }) => (
  <NextLink href={href}>
    <InnerLink {...props}>{children}</InnerLink>
  </NextLink>
)
