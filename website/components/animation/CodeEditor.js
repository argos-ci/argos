import { x } from '@xstyled/styled-components'
import { useAnimationFrame } from 'framer-motion'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { ControlButtons } from './ControlButtons'

const Tab = (props) => (
  <x.div
    borderRadius="5px 5px 0 0"
    borderColor="border"
    borderBottomColor="editor-background"
    borderWidth={1}
    px="20px"
    py="10px"
    color="color"
    fontSize="12px"
    mb="-10px"
    ml="80px"
    {...props}
  />
)

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

const Button = forwardRef(({ disabled, ...props }, ref) => (
  <x.div
    ref={ref}
    border={1}
    borderColor="border"
    color={disabled ? 'border' : 'white'}
    borderRadius="md"
    px="8px"
    py="4px"
    fontSize={12}
    bg="gray-900"
    boxShadow="md"
    transition="300ms"
    {...props}
  />
))

const defaultCode = `button {
  border-radius: 6px;
  height: 30px;
}`

const useTyping = (text, speed = 50, delay = 0, callback) => {
  const [textToType, setTextToType] = useState(text)
  let lastSavedTime = useRef(0)
  const [typedText, setTypedText] = useState('')
  const callbackTriggered = useRef(false)

  useEffect(() => {
    setTextToType(text)
    setTypedText('')
    lastSavedTime.current = 0
    callbackTriggered.current = false
  }, [text])

  useAnimationFrame((time) => {
    lastSavedTime.current ||= time
    if (typedText === textToType && !callbackTriggered.current) {
      callbackTriggered.current = true
      if (callback) return callback(typedText)
    }
    if (typedText === textToType) return
    if (typedText.length === 0 && time - lastSavedTime.current < delay) return
    if (time - lastSavedTime.current > speed) {
      lastSavedTime.current = time
      setTypedText((prev) => `${prev}${textToType[prev.length]}`)
    }
  })

  return typedText
}
export const CodeEditor = ({
  children = defaultCode,
  delayTyping = 0,
  callback,
  saveButtonRef,
  ...props
}) => {
  const typedChars = useTyping(children, 90, delayTyping, callback)

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
          <Tab>style.css</Tab>
          <Button ref={saveButtonRef}>Save</Button>
        </Header>

        <Body w={1}>
          <RowNumbers length={20} />
          <Code>{typedChars}</Code>
        </Body>
      </x.div>
    </x.div>
  )
}
