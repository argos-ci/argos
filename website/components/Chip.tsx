import { forwardRef } from "react";
import styled, { css } from "@xstyled/styled-components";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

import type { As, Options, SystemComponent } from "./types";

export type ChipOptions<T extends As = "div"> = Options<T> & {
  children: React.ReactNode;
  icon?: React.ComponentType;
  clickable?: boolean;
};

interface ChipStyledProps {
  $clickable?: ChipOptions["clickable"];
}

const InnerChip = styled.box(
  (p: ChipStyledProps) => css`
    display: inline-flex;
    align-items: center;
    gap: 2;
    background-color: chip-bg;
    color: chip-on;
    border-radius: chip;
    width: fit-content;
    padding: 2 4;
    font-size: sm;
    font-weight: 500;
    text-decoration: none;

    > [data-chip-icon] {
      width: 1em;
      height: 1em;
    }

    ${p.$clickable &&
    css`
      transition: default;
      will-change: background-color;

      > [data-chip-arrow] {
        opacity: 0.5;
        transition: default;
        will-change: transform opacity;
      }

      &:hover {
        background-color: chip-bg-hover;

        > [data-chip-arrow] {
          transform: translateX(4px) scale(1.1);
          opacity: 1;
        }
      }
    `}
  `
);

export const Chip: SystemComponent<ChipOptions> = forwardRef(
  ({ children, clickable, icon: Icon, ...props }, ref) => {
    return (
      <InnerChip ref={ref} $clickable={clickable} {...props}>
        {Icon && <Icon data-chip-icon="true" />}
        {children}
        {clickable ? (
          <ChevronRightIcon data-chip-icon="" data-chip-arrow="" />
        ) : null}
      </InnerChip>
    );
  }
);
