import { forwardRef } from "react";
import { Button as AriakitButton } from "ariakit/button";
import styled, { css, system } from "@xstyled/styled-components";

import type { As, Options, SystemComponent } from "./types";

export type ButtonOptions<T extends As = "button"> = Options<T> & {
  color?: "primary" | "secondary";
  variant?: "contained" | "outline";
  children: React.ReactNode;
};

interface ButtonStyledProps {
  $color?: ButtonOptions["color"];
  $variant?: ButtonOptions["variant"];
}

const InnerButton = styled.buttonBox(
  ({ $color = "primary", $variant }: ButtonStyledProps) => {
    const bgColor = `button-${$color}-bg`;
    const bgHoverColor = `button-${$color}-bg-hover`;
    const outlineColor = `button-${$color}-outline`;
    const outlineHoverColor = `button-${$color}-outline-hover`;
    return css`
      padding: 3 6;
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

      @media (min-width: md) {
        padding: 2 4;
      }

      &:disabled {
        opacity: 0.38;
      }

      &:focus {
        outline: 0;
      }

      &:focus-visible {
        ${system.apply({
          ring: 3,
          ringColor: `${$color}-300`,
        })}
      }

      ${$variant === "contained" &&
      css`
        color: button-contained-text;
        background-color: ${bgColor};

        &:hover:not(:disabled) {
          background-color: ${bgHoverColor};
        }
      `}

      ${$variant === "outline" &&
      css`
        color: ${outlineColor};
        background-color: transparent;
        border: 1;
        border-color: ${outlineColor};

        &:hover:not(:disabled) {
          color: ${outlineHoverColor};
          border-color: ${outlineHoverColor};
        }
      `}
    `;
  }
);

export const Button: SystemComponent<ButtonOptions> = forwardRef(
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
