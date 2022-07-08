import { x } from '@xstyled/styled-components'
import styled, { th } from '@xstyled/styled-components'
import { Button as AriakitButton } from 'ariakit/button'

const BaseButton = styled(AriakitButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  border-radius: md;
  border-style: none;
  alignself: center;
  cursor: pointer;
  gap: 1;
  padding: 2 4;
  color: white;
  transition: 300ms;

  &:focus,
  &:focus-visible,
  &[data-focus-visible] {
    outline: 2px solid;
    outline-color: outline;
  }

  background: linear-gradient(
    180deg,
    ${th.color('primary')},
    ${th.color('primary-a50')}
  );

  &:hover {
    background-color: primary-a50;
  }

  &:active {
    background-color: primary-a10;
  }

  &[aria-disabled='true'] {
    opacity: 0.5;
  }
`

export const Button = (props) => <x.div as={BaseButton} {...props} />

export const BlackButton = styled(BaseButton)`
  background: linear-gradient(${th.color('gray-600')}, ${th.color('gray-900')});

  &:hover {
    background: none;
    background-color: gray-800;
  }

  &:active {
    background-color: background-dark;
  }
`
