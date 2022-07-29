import styled from "@xstyled/styled-components";
import NextLink from "next/link";

const InnerLink = styled.box`
  cursor: pointer;
  color: white;
  transition: 300ms;
  display: flex;
  align-items: center;
  gap: 1;

  &:hover {
    color: secondary;
  }
`;

export const Link = ({ children, href, ...props }) => (
  <NextLink href={href}>
    <InnerLink {...props}>{children}</InnerLink>
  </NextLink>
);
