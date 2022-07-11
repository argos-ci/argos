import { x } from '@xstyled/styled-components'
import React, { forwardRef } from 'react'
import { IoCar, IoTrain } from 'react-icons/io5'

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

const Screenshot = ({ variant, children, ...props }) => {
  return (
    <x.div
      flex={1}
      border={1}
      borderColor={variant === 'blurred' ? 'border' : 'white'}
      bg="body-background"
      borderRadius="md"
      h="150px"
      p={2}
      position="relative"
      {...props}
    >
      {children}

      {variant === 'blurred' ? (
        <x.div
          backgroundColor="black-a50"
          position="absolute"
          top={0}
          left={0}
          w={1}
          h={1}
          borderRadius="md"
        />
      ) : null}
    </x.div>
  )
}

export const DetailsScreenshot = ({ variant, ...props }) => (
  <Screenshot {...props}>
    <x.div display="flex" alignItems="flex-end" gap={4} mb="8px">
      <IconContainer size="52px">
        <Icon as={IoTrain} size={8} />
      </IconContainer>
      <x.div flex={2 / 3} pb="5px">
        <Placeholder active w={1 / 2} />
        <Placeholder mt={2} />
      </x.div>
    </x.div>

    <x.div
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
    >
      <ParagraphPlaceholder w={0.5} />
      <PriceTag bg={variant ? 'primary-a80' : 'blue-500'}>$$$</PriceTag>
    </x.div>
    <ParagraphPlaceholder h="40px" mt={2} />
  </Screenshot>
)

export const DetailsScreenshotDiff = (props) => (
  <Screenshot {...props}>
    <x.div
      display="flex"
      justifyContent="flex-end"
      alignItems="flex-start"
      mt="60px"
      position="relative"
    >
      <PriceTag bg="secondary" color="body-background">
        $$$
      </PriceTag>
    </x.div>
  </Screenshot>
)

export const MobileScreenshot = ({ variant, ...props }) => (
  <Screenshot {...props}>
    <x.div display="flex" justifyContent="space-between" mb="20px">
      <IconContainer size="50px">
        <Icon as={IoCar} size={7} />
      </IconContainer>
      <PriceTag
        mt="15px"
        fontSize="21"
        fontWeight="200"
        h={variant === 'bugged' ? '13px' : '24px'}
        bg={variant ? 'primary-a80' : 'blue-500'}
      >
        $$$
      </PriceTag>
    </x.div>

    <Placeholder active w={1 / 2} mt={5} />

    <ParagraphPlaceholder mt={2} w={4 / 5} h="10px" />
    <ParagraphPlaceholder mt={3} />
  </Screenshot>
)

export const MobileScreenshotDiff = ({ variant, ...props }) => {
  return (
    <Screenshot {...props}>
      <x.div display="flex" justifyContent="flex-end" mt="15px">
        {variant === 'bugged' ? (
          <PriceTag position="absolute" h="13px" bg="red" variant="big" />
        ) : null}
        <PriceTag
          h="24px"
          bg={variant === 'bugged' ? 'red' : 'success'}
          variant="big"
        />
      </x.div>
    </Screenshot>
  )
}
