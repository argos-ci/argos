import React from "react";
import styled from "@xstyled/styled-components";

const InnerInput = styled.input`
  border-radius: md;
  line-height: 1.5;
  padding: 0 3;
  color: white;
  border: 1;
  border-color: border;
  width: 100%;
  background-color: background;

  &:hover {
    background-color: background-hover;
  }

  &:focus-visible,
  [data-focus-visible] {
    outline: none;
    border-color: border-active;
    background-color: black;
  }
`;

export const Input = (props) => <InnerInput {...props} />;
