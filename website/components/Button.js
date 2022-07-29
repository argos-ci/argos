import styled, { system, th } from "@xstyled/styled-components";

export const Button = styled.buttonBox`
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: md;
  cursor: pointer;
  border: 0;
  padding: 2 4;
  color: white;
  transition: default;
  transition-duration: 300ms;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;

  background-color: primary-700;

  &:hover,
  &:active {
    background-color: primary-800;
  }

  &:focus {
    outline: 0;
  }

  &:focus-visible {
    ${system.apply({ ring: 2, ringColor: "primary-300-a50" })}
  }

  &:disabled {
    opacity: 0.66;
  }
`;

export const BlackButton = styled(Button)`
  background: linear-gradient(${th.color("gray-600")}, ${th.color("gray-900")});

  &:hover {
    background: none;
    background-color: gray-800;
  }

  &:active {
    background-color: background-dark;
  }
`;
