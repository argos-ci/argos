import React from 'react'
import { motion } from 'framer-motion'
import { x } from '@xstyled/styled-components'

const Circle = (props) => (
  <x.div
    borderRadius="full"
    w="23px"
    h="23px"
    border={2}
    backgroundColor="black-a10"
    borderColor="white"
    {...props}
  />
)

export const Mouse = ({ children, ...props }) => (
  <x.div
    opacity={0.4}
    as={motion.div}
    position="absolute"
    zIndex={10000}
    mt="-12px"
    ml="-12px"
    {...props}
  >
    {children}
    <Circle />
  </x.div>
)

export const MouseClick = (props) => (
  <Circle
    as={motion.div}
    initial={{ opacity: 0 }}
    position="absolute"
    backgroundColor="black-a90"
    borderColor="secondary"
    {...props}
  />
)
