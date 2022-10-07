import styled, { system } from "@xstyled/styled-components";

export const Select = styled.div`
  border: 1px solid;
  border-color: layout-border;
  border-radius: default;
  background-color: transparent;
  color: on-light;
  position: relative;
  display: flex;
  align-items: center;

  &:has(> select:focus-visible) {
    ${system.apply({ ring: 3, ringColor: "secondary-focus-ring" })}
  }

  > [data-select-icon] {
    position: absolute;
    width: 4;
    height: 4;
    display: inline-flex;

    &:first-child {
      left: 8;
    }

    &:last-child {
      right: 8;
    }
  }

  > select {
    padding: 2 8;
    appearance: none;
    background-color: transparent;
    color: on-light;

    &:focus {
      outline: 0;
    }
  }
`;

export const SelectIcon: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <span data-select-icon="">{children}</span>;
};
