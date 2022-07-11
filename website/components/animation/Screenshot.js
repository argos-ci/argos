import { x } from '@xstyled/styled-components'
import React from 'react'
import { IoCar } from 'react-icons/io5'

const IconContainer = ({ size = '60px', ...props }) => (
  <x.div
    h={size}
    w={size}
    maxW={size}
    bg="black"
    boxShadow="md"
    border={1}
    borderRadius="md"
    borderColor="secondary"
    display="flex"
    justifyContent="center"
    alignItems="center"
    {...props}
  />
)

const Icon = ({ size = 6, ...props }) => (
  <x.div mx="auto" w={size} minW={size} h={size} minH={size} {...props} />
)

const Placeholder = ({ active, ...props }) => (
  <x.div
    h="8px"
    bg={active ? 'white' : 'secondary'}
    borderRadius="20px"
    w={1}
    {...props}
  />
)

const ParagraphPlaceholder = (props) => (
  <Placeholder borderRadius="4px" h="24px" bg="secondary" {...props} />
)

const PriceTag = ({ variant, bg = 'blue-500', ...props }) => (
  <x.div
    fontSize="12px"
    px="10px"
    borderRadius="22px"
    h="13px"
    bg={bg}
    w={variant === 'big' ? '58px' : 'auto'}
    {...props}
  />
)

const InnerScreenshot = ({ children, ...props }) => {
  return (
    <x.div
      flex={1}
      border={1}
      borderColor="border"
      backgroundColor="body-background"
      borderRadius="md"
      h="150px"
      w="160px"
      p={2}
      position="absolute"
      left="50%"
      transform
      translateX="-50%"
      {...props}
    >
      {children}
    </x.div>
  )
}

export const Screenshot = ({
  tagColor = 'blue-500',
  tagSize = 'md',
  ...props
}) => (
  <InnerScreenshot {...props}>
    <x.div display="flex" justifyContent="space-between" mb="20px">
      <IconContainer size="50px">
        <Icon as={IoCar} size={7} />
      </IconContainer>
      <PriceTag
        mt="15px"
        fontSize="21"
        fontWeight="200"
        h={tagSize === 'md' ? '24px' : '13px'}
        bg={tagColor}
      >
        $$$
      </PriceTag>
    </x.div>

    <Placeholder active w={1 / 2} mt={5} />

    <ParagraphPlaceholder mt={2} w={4 / 5} h="10px" />
    <ParagraphPlaceholder mt={3} />
  </InnerScreenshot>
)

export const ScreenshotDiff = ({ variant, ...props }) => {
  return (
    <InnerScreenshot {...props}>
      <x.div display="flex" justifyContent="flex-end" mt="15px">
        {variant === 'bugged' ? (
          <PriceTag position="absolute" h="13px" bg="danger" variant="big" />
        ) : null}
        <PriceTag
          h="24px"
          bg={variant === 'bugged' ? 'danger' : 'success'}
          variant="big"
        />
      </x.div>
    </InnerScreenshot>
  )
}

export const FakeScreenshotDiff = ({ color = 'danger', ...props }) => {
  return (
    <InnerScreenshot {...props}>
      <x.div display="flex" justifyContent="space-between" mb="20px">
        <IconContainer size="50px">
          <Icon as={IoCar} size={7} />
        </IconContainer>
        <x.div display="flex" justifyContent="flex-end" mt="15px">
          <PriceTag position="absolute" h="13px" bg={color} variant="big" />
          <PriceTag h="24px" bg="danger" variant="big" />
        </x.div>
      </x.div>
      <Placeholder active w={1 / 2} mt={5} />
      <ParagraphPlaceholder mt={2} w={4 / 5} h="10px" />
      <ParagraphPlaceholder mt={3} />
    </InnerScreenshot>
  )
}
