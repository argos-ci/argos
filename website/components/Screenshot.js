import { x } from '@xstyled/styled-components'
import { IoCar, IoThumbsDownOutline, IoThumbsUpOutline } from 'react-icons/io5'

const IconContainer = ({ size = '60px', ...props }) => (
  <x.div
    h={size}
    w={size}
    maxW={size}
    backgroundColor="white"
    boxShadow="md"
    border={1}
    borderRadius="full"
    borderColor="border"
    display="flex"
    justifyContent="center"
    alignItems="center"
    color="black"
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

const InnerScreenshot = ({ children, ...props }) => {
  return (
    <x.div
      flex={1}
      backgroundColor="black"
      pt={2}
      px={{ _: 1, sm: 3 }}
      pb={4}
      transition="800ms"
      {...props}
    >
      <x.div maxW="200px" mx="auto">
        {children}
      </x.div>
    </x.div>
  )
}

const Header = (props) => (
  <x.div display="flex" mx="auto" alignItems="center" h="50px" {...props} />
)
const ScreenshotLayoutHeader = (props) => (
  <Header {...props}>
    <IconContainer size="40px" flex={1}>
      <Icon as={IoCar} />
    </IconContainer>
    <x.div flex={1} ml="10px">
      <Placeholder active w={1 / 2} />
      <Placeholder mt={1} />
    </x.div>
  </Header>
)

const Body = (props) => <x.div mx="auto" h="62px" {...props} />
const ScreenshotLayoutBody = (props) => (
  <Body border={1} borderColor="transparent" {...props}>
    <ParagraphPlaceholder mt={2} h="20px" />
    <ParagraphPlaceholder mt={1} h="30px" />
  </Body>
)

const Price = (props) => (
  <x.div
    display="flex"
    justifyContent="flex-end"
    h="40px"
    pt="8px"
    {...props}
  />
)
const PriceTag = ({ backgroundColor = 'blue-500', ...props }) => (
  <x.div
    fontSize="21px"
    fontWeight="200"
    px="10px"
    borderRadius="22px"
    h="13px"
    backgroundColor={backgroundColor}
    w="58px"
    {...props}
  />
)

export const ScreenshotLegend = (props) => (
  <x.div
    borderLeft={1}
    borderColor="secondary"
    color="secondary"
    py={1}
    pl={2}
    ml={2}
    flex={1}
    maxH={26}
    {...props}
  />
)

export const ScreenshotContainer = (props) => (
  <x.div
    flex={1}
    display="flex"
    flexDirection="column"
    overflow="hidden"
    position="relative"
    {...props}
  />
)

export const Screenshot = ({
  tagColor = 'blue-500',
  tagSize = 'md',
  ...props
}) => (
  <InnerScreenshot
    backgroundImage="gradient-to-t"
    gradientFrom="gray-500-a20"
    gradientTo="blue-500-a30"
    {...props}
  >
    <ScreenshotLayoutHeader />
    <Price>
      <PriceTag
        backgroundColor={tagColor}
        h={tagSize === 'md' ? '24px' : '13px'}
      >
        $$$
      </PriceTag>
    </Price>
    <ScreenshotLayoutBody />
  </InnerScreenshot>
)

export const ScreenshotDiff = ({ variant, ...props }) => {
  return (
    <InnerScreenshot {...props}>
      <Header />
      <Price>
        {variant === 'bugged' ? (
          <PriceTag position="absolute" h="13px" bg="danger" />
        ) : null}
        <PriceTag h="24px" backgroundColor="danger" />
      </Price>
      <Body />
    </InnerScreenshot>
  )
}

export const FakeScreenshotDiff = ({ color = 'danger', ...props }) => {
  return (
    <InnerScreenshot
      backgroundImage="gradient-to-t"
      gradientFrom="gray-500-a20"
      gradientTo="blue-500-a30"
      {...props}
    >
      <ScreenshotLayoutHeader />
      <Price>
        <PriceTag position="absolute" h="13px" bg={color} />
        <PriceTag h="24px" bg="danger" />
      </Price>
      <ScreenshotLayoutBody />
    </InnerScreenshot>
  )
}

export const ScreenshotThumb = ({ success, ...props }) => (
  <x.div
    position="absolute"
    bottom="40px"
    left="50%"
    transform
    translateX="-50%"
    backgroundColor={success ? 'success' : 'danger'}
    color="white"
    borderRadius="full"
    w="40px"
    h="40px"
    p="6px"
    {...props}
  >
    <x.div
      as={success ? IoThumbsUpOutline : IoThumbsDownOutline}
      w={1}
      h={1}
      mt={success ? 0 : '2px'}
    />
  </x.div>
)
