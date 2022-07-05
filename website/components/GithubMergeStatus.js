import { x } from '@xstyled/styled-components'
import { IoCaretDownSharp } from 'react-icons/io5'
import { FaTimes } from 'react-icons/fa'
import { Image } from './Image'
import logo from '../img/logo.png'

const colors = {
  error: '#f85149',
  pending: '#d29922',
  success: '#2ea043',
  border: '#30363d',
  link: '#58a6ff',
  text: '#c9d1d9',
  paragraph: '#8b949e',
  backgroundLight: '#161b22',
}

const RequireButton = (props) => (
  <x.div
    border="1px solid"
    borderColor="#6e7681"
    px="7px"
    borderRadius="24px"
    fontSize="12px"
    fontWeight="500"
    lineHeight="18px"
    color={colors.text}
    {...props}
  />
)

const Link = (props) => <x.span color={colors.link} {...props} />
const LinkButton = (props) => (
  <x.div
    color={colors.link}
    fontSize="13px"
    lineHeight="18.2px"
    whiteSpace="nowrap"
    {...props}
  />
)

const CheckRow = (props) => (
  <x.div
    color={colors.text}
    word-wrap="break-word"
    justifyContent="space-between"
    font-size="13px"
    line-height="1.4"
    alignItems="center"
    display="flex"
    padding="8px 16px"
    border="solid"
    borderWidth="1px 0"
    borderColor={colors.border}
    bg={colors.backgroundLight}
    {...props}
  />
)
const CheckPart = (props) => <x.div display="flex" {...props} />
const CheckStatus = (props) => <x.div mt="2px" w="30px" {...props} />
const CheckPicture = (props) => (
  <x.div bg="white" borderRadius="6px" h="20px" w="20px" {...props} />
)

const BlackContainer = (props) => (
  <x.div
    p="16px"
    display="flex"
    gap="10px"
    justifyContent="space-between"
    color={colors.text}
    bg="black"
    {...props}
  />
)
const Circle = ({ color = colors.error, ...props }) => (
  <x.div
    w="30px"
    h="30px"
    minW="30px"
    minH="30px"
    border="solid 6px"
    borderRadius="50%"
    borderColor={color}
    transition="300ms"
    mb="1px"
    {...props}
  />
)
const Title = (props) => (
  <x.div
    fontWeight="600"
    fontSize="16px"
    lineHeight="1.4"
    mb="1px"
    transition="300ms"
    {...props}
  />
)

const Paragraph = (props) => (
  <x.div
    fontWeight="400"
    fontSize="13px"
    lineHeight="18.2px"
    transition="300ms"
    color={colors.paragraph}
    {...props}
  />
)

const LeftButton = (props) => (
  <x.div
    padding="5px 16px"
    fontSize="14px"
    fontWeight="500"
    lineHeight="20px"
    border="solid"
    borderWidth="1px 0px 1px 1px"
    color="rgba(248, 81, 73, 0.5)"
    backgroundColor="rgb(13, 17, 23)"
    borderColor="rgba(240, 246, 252, 0.1)"
    borderRadius="6px 0 0 6px"
    display="inline-block"
    h="32px"
    {...props}
  />
)

const RightButton = (props) => (
  <x.div
    padding="9px 13.5px"
    fontSize="14px"
    fontWeight="500"
    lineHeight="20px"
    border="solid"
    borderWidth="1px 1px 1px 1px"
    color={colors.error}
    backgroundColor="#21262d"
    borderColor="rgba(240, 246, 252, 0.1)"
    borderRadius="0 6px 6px 0"
    display="inline-block"
    h="32px"
    {...props}
  />
)

function getStatusProps(status) {
  switch (status) {
    case 'success':
      return {
        color: colors.success,
        title: 'All check have passed',
        paragraph: '1 successful check',
      }
    case 'pending':
      return {
        color: colors.pending,
        title: "Some checks haven't completed yet",
        paragraph: '1 pending check',
        iconProps: {
          borderRadius: '50%',
          w: '10px',
          h: '10px',
          mt: '2px',
          backgroundColor: colors.pending,
        },
        checkParagraph: '— Pending',
      }

    default:
      return {
        color: colors.error,
        title: 'Some checks were not successful',
        paragraph: '1 failing check',
        iconProps: { as: FaTimes, color: colors.error, w: '10px' },
        checkParagraph: '— 1 difference detected, waiting for your decision',
      }
  }
}

export const GithubMergeStatus = ({ status = 'pending', ...props }) => {
  const { color, title, paragraph, iconProps, checkParagraph } =
    getStatusProps(status)

  return (
    <x.div
      borderRadius="6px"
      border="1px solid"
      borderColor={colors.border}
      zIndex={100}
      transition="opacity 800ms 300ms"
      {...props}
    >
      <BlackContainer borderRadius="6px 6px 0 0">
        <x.div display="flex" gap="10px">
          <Circle color={color} />
          <div>
            <Title color={color}>{title}</Title>
            <Paragraph>{paragraph}</Paragraph>
          </div>
        </x.div>
        <LinkButton>Hide all checks</LinkButton>
      </BlackContainer>

      <CheckRow>
        <CheckPart>
          <CheckStatus>
            <x.div mx="auto" transition="300ms" {...iconProps} />
          </CheckStatus>

          <CheckPicture mr="8px">
            <Image src={logo} width="20px" height="20px" alt="@argos-ci" />
          </CheckPicture>

          <Paragraph>
            <x.span color={colors.text}>argos</x.span> {checkParagraph}
          </Paragraph>
        </CheckPart>

        <CheckPart>
          <LinkButton ml="10px">Details</LinkButton>
        </CheckPart>
      </CheckRow>

      <BlackContainer>
        <Circle color={colors.pending} />
        <x.div>
          <Title color={colors.pending}>
            Required statuses must pass before merging
          </Title>
          <Paragraph>
            All required <Link>statuses</Link> and check runs on this pull
            request must run successfully to enable automatic merging.
          </Paragraph>
        </x.div>
      </BlackContainer>

      <x.div
        p="16px"
        bg={colors.backgroundLight}
        borderRadius="0 0 6px 6px"
        borderTop={1}
        borderColor={colors.border}
      >
        <x.div display="flex" alignItems="center">
          <LeftButton>Merge pull request</LeftButton>
          <RightButton>
            <x.div as={IoCaretDownSharp} mb="-3px" w="10px" />
          </RightButton>
        </x.div>
        <x.div
          color={colors.text}
          fontSize="12px"
          lineHeight="18px"
          mt="8px"
          ml="4px"
        >
          You can also <Link>open this in GitHub Desktop</Link> or view{' '}
          <Link>command line instructions</Link>.
        </x.div>
      </x.div>
    </x.div>
  )
}
