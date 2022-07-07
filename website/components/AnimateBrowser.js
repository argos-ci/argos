import { x } from '@xstyled/styled-components'
import { useMotionValue } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { IoReload } from 'react-icons/io5'
import { AnimateMouse } from './AnimateMouse'
import { ControlButtons } from './ControlButtons'

const Header = (props) => (
  <x.div
    h="40px"
    display="flex"
    alignItems="center"
    borderBottom={1}
    borderColor="border"
    position="relative"
    {...props}
  />
)

const SearchBar = ({ children, ...props }) => (
  <x.div
    textAlign="center"
    bg="body-background"
    h="28px"
    pt="7px"
    borderRadius="sm"
    w={1 / 3}
    fontSize="12px"
    position="relative"
    mx="auto"
    {...props}
  >
    {children}
    <x.div
      as={IoReload}
      position="absolute"
      right="12px"
      top="6px"
      w="14px"
      h="14px"
    />
  </x.div>
)

const Body = (props) => <x.div p="12px" {...props} />

export const Browser = ({ children, onClose, autoCloseDelay, ...props }) => {
  return (
    <x.div
      borderRadius="md"
      border={1}
      borderColor="border"
      bg="#001320"
      overflow="hidden"
      position="absolute"
      zIndex={400}
      w="600px"
      {...props}
    >
      <Header>
        <ControlButtons />
        <SearchBar>argos.com</SearchBar>
      </Header>
      <Body>{children}</Body>

      {autoCloseDelay ? (
        <AnimateMouse
          from={{ left: 100, top: 130, opacity: 0 }}
          to={{ left: 9, top: 14, opacity: 1 }}
          delay={autoCloseDelay + 3}
          callback={onClose}
        />
      ) : null}
    </x.div>
  )
}
