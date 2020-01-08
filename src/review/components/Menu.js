import React from 'react'
import {
  useMenuState,
  Menu as ReakitMenu,
  MenuItem as ReakitMenuItem,
  MenuDisclosure,
} from 'reakit/Menu'
import styled from '@xstyled/styled-components'

export { useMenuState, MenuDisclosure }

const InnerMenu = styled.div`
  background-color: darker;
  border-radius: base;
  padding: 2 1;
  min-width: 110;

  &:focus {
    outline: none;
  }

  &[data-animated='true'] {
    transition: 300ms;
    transition-property: opacity;
    display: block !important;

    &[hidden][data-animating='false'] {
      display: none !important;
    }

    &[hidden],
    &[data-animating='true']:not([hidden]) {
      opacity: 0;
    }

    &:not([hidden]),
    &[hidden][data-animating='true'] {
      opacity: 1;
    }
  }
`

export const Menu = React.forwardRef(function Menu(
  { children, ...props },
  ref,
) {
  return (
    <ReakitMenu
      ref={ref}
      data-animated={props.unstable_animated}
      data-animating={props.unstable_animating}
      {...props}
    >
      {menuProps => <InnerMenu {...menuProps}>{children}</InnerMenu>}
    </ReakitMenu>
  )
})

const InnerMenuItem = styled.buttonBox`
  appearance: none;
  background-color: transparent;
  padding: 2;
  border: 0;
  border-radius: base;
  color: light300;
  font-size: 14;
  display: block;
  width: 100%;
  text-align: left;
  transition: base;
  transition-property: background-color;
  cursor: pointer;
  /* For links */
  text-decoration: none;

  &:focus,
  &:hover {
    outline: none;
    background-color: light800;
  }
`

export const MenuItem = React.forwardRef(function MenuItem(props, ref) {
  return <ReakitMenuItem ref={ref} as={InnerMenuItem} {...props} />
})
