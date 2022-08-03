import styled, { system, th, css } from "@xstyled/styled-components";

export const Button = styled.buttonBox(({ $tint = "primary" }) => {
  const bgColor = th.color(`${$tint}-800`);
  const hoverBgColor = th.color(`${$tint}-500`);

  return css`
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: md;
    cursor: pointer;
    border: 0;
    padding: 3 4;
    color: white;
    transition: default;
    transition-duration: 300ms;
    font-weight: 600;
    line-height: 1;
    text-decoration: none;

    background-color: ${bgColor};

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      background-color: ${hoverBgColor};
    }

    &:focus {
      outline: 0;
    }

    &:focus-visible {
      ${system.apply({ ring: 2, ringColor: "primary-300-a50" })}
    }

    &:disabled {
      cursor: default;
      opacity: 0.38;
    }
  `;
});
