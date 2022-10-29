import { Button as AriakitButton } from "ariakit/button";
import styled, { css, system } from "@xstyled/styled-components";
import { forwardRef } from "react";

const InnerButton = styled.buttonBox(({ $color = "primary", $toggle }) => {
  const onColor = `icon-button-${$color}-on`;
  const bgColor = `icon-button-${$color}-bg`;
  const onHoverColor = `icon-button-${$color}-on-hover`;
  const bgHoverColor = `icon-button-${$color}-bg-hover`;
  const bgActiveColor = `icon-button-${$color}-bg-active`;

  return css`
    padding: 2;
    transition: default;
    transition-duration: instant;
    border-radius: md;
    color: ${onColor};
    background-color: ${bgColor};
    align-self: center;

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

    &:hover:not(:disabled) {
      color: ${onHoverColor};
      background-color: ${bgHoverColor};
    }

    > [data-button-icon] {
      width: 1em;
      height: 1em;
      min-width: 1em;
      min-height: 1em;
    }

    ${$toggle === true &&
    css`
      color: ${onHoverColor};
      background-color: ${bgActiveColor};
    `}
  `;
});

export const IconButton = forwardRef(
  ({ color = "primary", icon: Icon, as, toggle, ...props }, ref) => {
    if (!Icon) return null;

    return (
      <AriakitButton ref={ref} {...props}>
        {(buttonProps) => (
          <InnerButton {...buttonProps} $color={color} as={as} $toggle={toggle}>
            <Icon data-button-icon="" />
          </InnerButton>
        )}
      </AriakitButton>
    );
  }
);
