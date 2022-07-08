import { x } from '@xstyled/styled-components'
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

const Browser = ({ children, ...props }) => {
  return (
    <x.div
      borderRadius="md"
      border={1}
      borderColor="border"
      bg="#001320"
      overflow="hidden"
      position="absolute"
      zIndex={400}
      w="550px"
      {...props}
    >
      <Header>
        <ControlButtons />
        <SearchBar>argos.com</SearchBar>
      </Header>
      <Body>{children}</Body>
    </x.div>
  )
}

export const AutoCloseBrowser = ({
  children,
  onClose,
  autoCloseDelay,
  ...props
}) => {
  return (
    <Browser {...props}>
      {children}

      {autoCloseDelay ? (
        <AnimateMouse
          from={{ left: 100, top: 130, opacity: 0 }}
          to={{ left: 17, top: 19, opacity: 1 }}
          delay={autoCloseDelay + 3}
          callback={onClose}
        />
      ) : null}
    </Browser>
  )
}
