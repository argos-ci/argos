import * as React from "react";
import { Button as AriakitButton } from "ariakit/button";
import styled, { css, system } from "@xstyled/styled-components";

const InnerButton = styled.buttonBox(({ $color = "primary", $variant }) => {
  const bgColor = `button-${$color}-bg`;
  const bgHoverColor = `button-${$color}-bg-hover`;
  const outlineColor = `button-${$color}-outline`;
  const outlineHoverColor = `button-${$color}-outline-hover`;

  return css`
    padding: 2 4;
    font-family: default;
    font-size: sm;
    font-weight: 500;
    line-height: 1;
    transition: default;
    transition-duration: instant;
    text-decoration: none;
    white-space: nowrap;
    border-radius: lg;
    text-align: center;
    border: 1;
    display: flex;
    gap: 1;

    &:disabled {
      opacity: 0.38;
    }

    &:focus {
      outline: 0;
    }

    &:focus-visible {
      ${system.apply({
        ring: 3,
        ringColor: `${$color}-focus-ring`,
      })}
    }

    ${$variant === "contained" &&
    css`
      color: button-contained-text;
      background-color: ${bgColor};
      border-color: ${bgColor};

      &:hover:not(:disabled) {
        background-color: ${bgHoverColor};
      }
    `}

    ${$variant === "outline" &&
    css`
      color: ${outlineColor};
      background-color: transparent;
      border-color: ${outlineColor};

      &:hover:not(:disabled) {
        color: ${outlineHoverColor};
        border-color: ${outlineHoverColor};
      }
    `}
  `;
});

export const Button = React.forwardRef(
  (
    { color = "primary", variant = "contained", children, as, ...props },
    ref
  ) => {
    return (
      <AriakitButton ref={ref} {...props}>
        {(buttonProps) => (
          <InnerButton
            {...buttonProps}
            $color={color}
            $variant={variant}
            as={as}
          >
            {children}
          </InnerButton>
        )}
      </AriakitButton>
    );
  }
);
