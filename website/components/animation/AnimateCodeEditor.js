import { forwardRef, useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import {
  CodeEditor,
  CodeEditorBody,
  CodeEditorHeader,
  CodeEditorTab,
} from '@components/CodeEditor'

function trimLastChar(typedText, editableLines = []) {
  const lines = typedText.split('\n')
  const filledEditableLines = editableLines.filter(
    (lineIndex) => !lines[lineIndex].match(/^\s+$/),
  )
  if (filledEditableLines.length === 0) return typedText
  return lines
    .map((line, index) =>
      index === filledEditableLines[0] ? line.slice(0, -1) : line,
    )
    .join('\n')
}

const trimLines = (text, lineIndexes) =>
  text
    .split('\n')
    .filter((_, index) => !lineIndexes.includes(index))
    .join('\n')

const useTyping = ({ text, linesToTrim = [], typingSpeed = 90, onSave }) => {
  let lastSavedTime = useRef(0)
  const callbackTriggered = useRef(false)

  const [textToType, setTextToType] = useState(text)
  const [typedText, setTypedText] = useState('')

  const isTypingOver = (formattedCode) => formattedCode === textToType
  const isNextCharTime = (time) => !(time - lastSavedTime.current < typingSpeed)

  useEffect(() => {
    if (linesToTrim.length > 0) {
      setTextToType((prev) => trimLines(String(prev), linesToTrim))
      lastSavedTime.current = 0
      callbackTriggered.current = false
    }
  }, [linesToTrim])

  useAnimationFrame((time) => {
    lastSavedTime.current ||= time
    const formattedCode = typedText.replaceAll(/\n\s*\n/g, '\n')

    if (isTypingOver(formattedCode)) {
      if (callbackTriggered.current) return
      callbackTriggered.current = true
      setTypedText(formattedCode)
      return setTimeout(() => onSave(formattedCode), 800)
    }

    if (isNextCharTime(time)) {
      lastSavedTime.current = time
      return linesToTrim.length === 0
        ? setTypedText((prev) => `${prev}${textToType[prev.length]}`)
        : setTypedText((prev) => trimLastChar(prev, linesToTrim))
    }
  })

  return typedText
}

export const AnimateCodeEditor = forwardRef(
  ({ children, linesToTrim = [], onSave, ...props }, ref) => {
    const typedText = useTyping({ text: children, linesToTrim, onSave })

    return (
      <x.div position="absolute" ref={ref} {...props}>
        <CodeEditor>
          <CodeEditorHeader>
            <CodeEditorTab active={false}>style.css</CodeEditorTab>
          </CodeEditorHeader>
          <CodeEditorBody>{typedText}</CodeEditorBody>
        </CodeEditor>
      </x.div>
    )
  },
)
