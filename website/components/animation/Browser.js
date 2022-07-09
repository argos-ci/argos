import { x } from '@xstyled/styled-components'
import { IoReload } from 'react-icons/io5'
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

export const Browser = ({ children, closeButtonRef, ...props }) => {
  return (
    <x.div
      borderRadius="md"
      border={1}
      borderColor="border"
      backgroundColor="editor-background"
      overflow="hidden"
      zIndex={400}
      w="550px"
      {...props}
    >
      <Header>
        <ControlButtons closeButtonRef={closeButtonRef} />
        <SearchBar>argos.com</SearchBar>
      </Header>
      <Body>{children}</Body>
    </x.div>
  )
}
