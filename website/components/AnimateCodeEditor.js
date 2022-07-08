import { x } from '@xstyled/styled-components'
import { useAnimationFrame, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AnimateMouse } from './AnimateMouse'
import { ControlButton, ControlButtons } from './ControlButtons'

const colors = {
  background: '#001320',
  rowNumber: '#49657a',
}

const Tab = (props) => (
  <x.div
    borderRadius="5px 5px 0 0"
    borderColor="border"
    borderBottomColor={colors.background}
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
    color={colors.rowNumber}
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

const Button = ({ disabled, hover, ...props }) => (
  <x.div
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
)

const defaultCode = `button {
  border-radius: 6px;
  height: 30px;
}`

const useTyping = (text, speed = 50, delay = 0) => {
  const [textToType, setTextToType] = useState(text)
  let lastSavedTime = useRef(0)
  const [textEnd, setTextEnd] = useState(0)

  useEffect(() => {
    setTextToType(text)
    setTextEnd(0)
    lastSavedTime.current = 0
  }, [text])

  useAnimationFrame((time) => {
    if (textEnd >= textToType.length) return
    if (textEnd === 0 && time - lastSavedTime.current < delay) return
    if (time - lastSavedTime.current > speed) {
      lastSavedTime.current = time
      setTextEnd((prev) => prev + 1)
    }
  })

  return textToType.slice(0, textEnd)
}
export const CodeEditor = ({
  children = defaultCode,
  delayTyping = 0,
  callback,
  ...props
}) => {
  const typedChars = useTyping(children, 90, delayTyping)

  return (
    <x.div position="absolute" {...props}>
      <x.div
        borderRadius="md"
        boxShadow="md"
        border={1}
        borderColor="border"
        backgroundColor={colors.background}
        overflow="hidden"
        position="relative"
        h="230px"
      >
        <Header>
          <ControlButtons />
          <Tab>style.css</Tab>
          <Button>Save</Button>
        </Header>

        <Body w={1}>
          <RowNumbers length={20} />
          <Code>{typedChars}</Code>
        </Body>

        {typedChars.length === children.length ? (
          <AnimateMouse
            from={{ opacity: 0, x: 150, top: 200 }}
            to={{ opacity: 1, x: 300, top: 15 }}
            delay={0}
            callback={() => callback(typedChars)}
          />
        ) : null}
      </x.div>
    </x.div>
  )
}
