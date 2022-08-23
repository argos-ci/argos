import styled from "@xstyled/styled-components";

export const Avatar = styled.imgBox`
  border-radius: 50%;
  width: 30;
  height: 30;
  transition: base;

  &:focus,
  &[aria-expanded="true"] {
    box-shadow: 0 0 1px 1px white;
    outline: none;
  }

  &[role="button"] {
    cursor: default;
  }
`;
