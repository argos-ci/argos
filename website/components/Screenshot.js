import { x } from '@xstyled/styled-components'
import { FaUmbrellaBeach } from 'react-icons/fa'
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

const PriceTag = ({ bg = 'blue-500', variant, ...props }) => (
  <x.div
    fontSize="12px"
    px="10px"
    borderRadius="22px"
    h="13px"
    bg={bg}
    {...props}
  />
)

const Desktop = (props) => (
  <x.div
    flex={1}
    border={1}
    borderColor="border"
    bg="body-background"
    borderRadius="md"
    h="150px"
    p={2}
    {...props}
  />
)

const Header = (props) => (
  <x.div display="flex" alignItems="flex-end" gap={4} mb="8px" {...props} />
)

export const DetailsScreenshot = ({ variant, ...props }) => (
  <Desktop {...props}>
    <Header>
      <IconContainer size="52px">
        <Icon as={IoTrain} size={8} />
      </IconContainer>
      <x.div flex={2 / 3} pb="5px">
        <Placeholder active w={1 / 2} />
        <Placeholder mt={2} />
      </x.div>
    </Header>

    <x.div
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
    >
      <ParagraphPlaceholder w={0.5} />
      <PriceTag bg={variant ? 'primary-a80' : 'blue-500'}>$$$</PriceTag>
    </x.div>
    <ParagraphPlaceholder h="40px" mt={2} />
  </Desktop>
)

export const DetailsScreenshotDiff = (props) => (
  <Desktop {...props}>
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
  </Desktop>
)

const Mobile = (props) => (
  <x.div
    mx="auto"
    w="160px"
    h="155px"
    border={1}
    borderColor="border"
    bg="body-background"
    p="10px"
    borderRadius="md"
    position="relative"
    {...props}
  />
)

export const MobileScreenshot = ({ variant, ...props }) => (
  <x.div flex={1} {...props}>
    <Mobile>
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
    </Mobile>
  </x.div>
)

export const MobileScreenshotDiff = ({ variant, ...props }) => (
  <x.div flex={1} {...props}>
    <Mobile>
      {variant === 'bugged' ? (
        <PriceTag
          position="absolute"
          right="10"
          fontSize="21"
          fontWeight="200"
          h="13px"
          float="right"
          color="body-background"
          bg="red"
          mt="15px"
        >
          $$$
        </PriceTag>
      ) : null}
      <PriceTag
        fontSize="21"
        fontWeight="200"
        h="24px"
        float="right"
        color="body-background"
        bg={variant === 'bugged' ? 'red' : 'success'}
        mt="15px"
      >
        $$$
      </PriceTag>
    </Mobile>
  </x.div>
)
