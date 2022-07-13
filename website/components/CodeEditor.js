import { x } from '@xstyled/styled-components'
import { forwardRef } from 'react'
import { FaTimes } from 'react-icons/fa'
import { ControlButtons } from './animation/ControlButtons'

export const CodeEditorTab = ({ children, active = 'false', ...props }) => {
  return (
    <x.div
      borderRadius="5px 5px 0 0"
      borderColor="border"
      borderBottomColor="background-secondary"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={3}
      borderWidth={1}
      px="16px"
      py="10px"
      fontSize="12px"
      mb="-10px"
      ml="80px"
      transition="1000ms"
      color={active ? 'border' : 'white'}
      {...props}
    >
      {children}

      {active ? (
        <x.div as={FaTimes} w="8px" />
      ) : (
        <x.div borderRadius="full" backgroundColor="gray-100" w="8px" h="8px" />
      )}
    </x.div>
  )
}

export const CodeEditorHeader = ({ children, ...props }) => (
  <x.div
    display="flex"
    alignItems="center"
    justifyContent="space-between"
    h="45px"
    borderBottom={1}
    borderColor="border"
    pr="12px"
    {...props}
  >
    <ControlButtons />
    {children}
  </x.div>
)

const RowNumbers = ({ length = 20, ...props }) => (
  <x.div
    color="#49657a"
    display="flex"
    flexDirection="column"
    alignItems="center"
    px="6px"
    w="24px"
    backgroundColor="body-background"
    pt="12px"
    {...props}
  >
    {Array.from({ length }, (_, i) => (
      <div key={i}>{i + 1}</div>
    ))}
  </x.div>
)

export const CodeEditorBody = ({ children, ...props }) => (
  <x.div display="flex" fontSize="15px" h={1} lineHeight="24px" {...props}>
    <CodeEditorBody w={1}>
      <RowNumbers length={20} />
      <x.pre p="13px 12px 12px" color="white" flex="auto">
        {children}
      </x.pre>
    </CodeEditorBody>
  </x.div>
)

export const CodeEditor = forwardRef(({ children, ...props }, ref) => {
  return (
    <x.div
      borderRadius="md"
      boxShadow="md"
      border={1}
      borderColor="border"
      backgroundColor="background-secondary"
      overflow="hidden"
      position="relative"
      h="230px"
      ref={ref}
      {...props}
    >
      {children}
    </x.div>
  )
})
