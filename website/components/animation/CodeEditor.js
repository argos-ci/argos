import { x } from '@xstyled/styled-components'
import { useAnimationFrame } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { ControlButtons } from './ControlButtons'

const Tab = ({ children, active, ...props }) => {
  return (
    <x.div
      borderRadius="5px 5px 0 0"
      borderColor="border"
      borderBottomColor="editor-background"
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

const Header = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    justifyContent="space-between"
    h="45px"
    borderBottom={1}
    borderColor="border"
    pr="12px"
    {...props}
  />
)

const Body = (props) => (
  <x.div display="flex" fontSize="15px" h={1} lineHeight="24px" {...props} />
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

const Code = (props) => (
  <x.pre p="13px 12px 12px" color="white" flex="auto" {...props} />
)

const useTyping = ({
  text,
  removeCodeLines = [],
  typingSpeed = 90,
  typingDelay = 0,
  onSave,
}) => {
  let lastSavedTime = useRef(0)
  const callbackTriggered = useRef(false)

  const [textToType, setTextToType] = useState(text)
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    if (removeCodeLines.length > 0) {
      setTextToType((prev) =>
        String(prev)
          .split('\n')
          .filter((_, index) => !removeCodeLines.includes(index))
          .join('\n'),
      )
      lastSavedTime.current = 0
      callbackTriggered.current = false
    }
  }, [removeCodeLines])

  function removeChar() {
    if (removeCodeLines.length === 0) return

    const removeLineIndex = removeCodeLines[0]
    const lines = typedText.split('\n')

    if (lines[removeLineIndex].match(/^\s+$/)) {
      removeCodeLines.shift()
      setTypedText((prev) =>
        prev
          .split('\n')
          .map((line, index) => (index === removeLineIndex ? '' : line))
          .join('\n'),
      )
      return removeChar()
    }

    setTypedText((prev) =>
      prev
        .split('\n')
        .map((line, index) =>
          index === removeLineIndex ? line.slice(0, -1) : line,
        )
        .join('\n'),
    )
  }

  useAnimationFrame((time) => {
    lastSavedTime.current ||= time
    const formattedCode = typedText.replaceAll('\n\n', '\n')

    if (formattedCode === textToType) {
      if (callbackTriggered.current) return
      callbackTriggered.current = true
      setTypedText(formattedCode)
      return setTimeout(() => onSave(formattedCode), 800)
    }

    if (typedText.length === 0 && time - lastSavedTime.current < typingDelay) {
      return
    }

    if (time - lastSavedTime.current < typingSpeed) return

    lastSavedTime.current = time
    return removeCodeLines.length === 0
      ? setTypedText((prev) => `${prev}${textToType[prev.length]}`)
      : removeChar()
  })

  return typedText
}

export const CodeEditor = ({
  children,
  typingDelay = 0,
  removeCodeLines = [],
  typingSpeed = 90,
  onSave,
  ...props
}) => {
  const typedText = useTyping({
    text: children,
    removeCodeLines,
    typingSpeed,
    typingDelay,
    onSave,
  })

  return (
    <x.div position="absolute" {...props}>
      <x.div
        borderRadius="md"
        boxShadow="md"
        border={1}
        borderColor="border"
        backgroundColor="editor-background"
        overflow="hidden"
        position="relative"
        h="230px"
      >
        <Header>
          <ControlButtons />
          <Tab active={false}>style.css</Tab>
        </Header>

        <Body w={1}>
          <RowNumbers length={20} />
          <Code>{typedText}</Code>
        </Body>
      </x.div>
    </x.div>
  )
}
