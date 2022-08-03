import { x } from "@xstyled/styled-components";
import { useAnimationFrame } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { Code } from "./Code";
import { ControlButtons } from "./ControlButtons";

function trimLastChar(text, linesToTrim = []) {
  const lines = text.split("\n");
  let lineIndex = lines.length - 1;

  while (lineIndex > -1) {
    if (linesToTrim.includes(lineIndex) && !lines[lineIndex].match(/^\s+$/)) {
      return lines
        .map((line, index) => (index === lineIndex ? line.slice(0, -1) : line))
        .join("\n");
    }
    lineIndex -= 1;
  }
  return text;
}

const trimLines = (text, lineIndexes) =>
  text
    .split("\n")
    .filter((_, index) => !lineIndexes.includes(index))
    .join("\n");

export const useTyping = ({
  text,
  linesToTrim = [],
  typingSpeed = 90,
  onSave,
}) => {
  let lastSavedTime = useRef(0);
  const callbackTriggered = useRef(false);

  const [typedText, setTypedText] = useState("");

  const isFinishTyping = (formattedCode) =>
    formattedCode === trimLines(text, linesToTrim);
  const isNextCharTime = (time) => time - lastSavedTime.current >= typingSpeed;

  useEffect(() => {
    if (linesToTrim.length > 0) {
      callbackTriggered.current = false;
    }
  }, [linesToTrim]);

  useAnimationFrame((time) => {
    lastSavedTime.current ||= time;
    const formattedCode = typedText.replaceAll(/\n\s*\n/g, "\n");
    if (isFinishTyping(formattedCode) && callbackTriggered.current) return;
    if (isFinishTyping(formattedCode) && !callbackTriggered.current) {
      callbackTriggered.current = true;
      setTypedText(formattedCode);
      return setTimeout(() => onSave(formattedCode), 800);
    }

    if (isNextCharTime(time)) {
      lastSavedTime.current = time;
      return linesToTrim.length === 0
        ? setTypedText((prev) => `${prev}${text[prev.length]}`)
        : setTypedText((prev) => trimLastChar(prev, linesToTrim));
    }
  });

  return typedText;
};

export const CodeEditorCloseTabIcon = (props) => (
  <x.div as={FaTimes} w="8px" {...props} />
);

export const CodeEditorEditingTabIcon = (props) => (
  <x.div
    borderRadius="full"
    backgroundColor="gray-100"
    w="8px"
    h="8px"
    {...props}
  />
);

export const CodeEditorTab = ({ children, active = false, ...props }) => {
  return (
    <x.div
      borderRadius="default default 0 0"
      borderColor="border"
      borderBottomColor="editor-bg"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={3}
      borderWidth="1px 1px 3px 1px"
      px="16px"
      py="10px"
      fontSize="12px"
      mb="-10px"
      ml="80px"
      transition="1000ms"
      color={active ? "on" : "on-light"}
      {...props}
    >
      {children}
    </x.div>
  );
};

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
);

// const RowNumbers = ({ length = 20, ...props }) => (
//   <x.div
//     color="editor-line-number"
//     display="flex"
//     flexDirection="column"
//     alignItems="center"
//     pt="12px"
//     w="24px"
//     backgroundColor="editor-line-number-bg"
//     fontSize="xs"
//     {...props}
//   >
//     {Array.from({ length }, (_, i) => (
//       <div key={i}>{i + 1}</div>
//     ))}
//   </x.div>
// );

export const CodeEditorBody = ({ children, language, ...props }) => (
  <x.div
    display="flex"
    fontSize="15px"
    w={1}
    h={1}
    lineHeight="24px"
    {...props}
  >
    {/* <RowNumbers length={20} /> */}
    <Code p={3} overflow="auto" language={language}>
      {children}
    </Code>
  </x.div>
);

export const CodeEditor = ({ children, ...props }) => (
  <x.div
    borderRadius="md"
    boxShadow="md"
    border={1}
    borderColor="border"
    bg="editor-bg"
    overflow="hidden"
    position="relative"
    h={230}
    {...props}
  >
    {children}
  </x.div>
);
