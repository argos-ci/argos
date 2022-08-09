import styled from "@xstyled/styled-components";

export const FadeLink = styled.aBox`
  transition: base;
  text-decoration: none;
  color: inherit;

  &:hover {
    opacity: 0.75;
  }
`;
