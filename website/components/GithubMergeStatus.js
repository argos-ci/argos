import { useState } from 'react'
import { x } from '@xstyled/styled-components'
import { IoCaretDownSharp } from 'react-icons/io5'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { Image } from './Image'
import logo from '../img/logo.png'
import { Button } from './Button'
import { AnimateMouse } from './AnimateMouse'

const colors = {
  error: '#f85149',
  pending: '#d29922',
  success: '#2ea043',
  border: '#30363d',
  link: '#58a6ff',
  text: '#c9d1d9',
  neutralTitle: '#f0f6fc',
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
const CheckStatus = (props) => (
  <x.div mt="2px" w="30px" minW="30px" {...props} />
)
const CheckPicture = (props) => (
  <x.div bg="white" borderRadius="6px" h="20px" w="20px" {...props} />
)

const BlackContainer = (props) => (
  <x.div
    p="16px"
    display="flex"
    gap="10px"
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
    transition="1000ms"
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
    transition="1000ms"
    {...props}
  />
)

const Paragraph = (props) => (
  <x.div
    fontWeight="400"
    fontSize="13px"
    lineHeight="18.2px"
    transition="1000ms"
    color={colors.paragraph}
    {...props}
  />
)

const GreenCheckIcon = (props) => (
  <x.div
    w="30px"
    h="30px"
    bg={colors.success}
    borderRadius="50%"
    display="flex"
    justifyContent="center"
    alignItems="center"
    {...props}
  >
    <x.div as={FaCheck} color="white" w="14px" />
  </x.div>
)

const BaseButton = ({ status, ...props }) => (
  <x.div
    padding="13.5px"
    fontSize="14px"
    fontWeight="500"
    lineHeight="20px"
    border="solid"
    borderWidth="1px 1px 1px 1px"
    color={status === 'success' ? 'white' : 'rgba(248, 81, 73, 0.5)'}
    backgroundColor={status === 'success' ? colors.success : '#0d1117'}
    borderColor="rgba(240, 246, 252, 0.1)"
    display="flex"
    alignItems="center"
    h="32px"
    {...props}
  />
)

const LeftButton = (props) => (
  <x.div
    as={BaseButton}
    borderWidth="1px 0px 1px 1px"
    borderRadius="6px 0 0 6px"
    {...props}
  />
)

const RightButton = ({ status, ...props }) => (
  <x.div
    as={BaseButton}
    borderRadius="0 6px 6px 0"
    borderLeft={0}
    backgroundColor={status === 'success' ? colors.success : '#21262d'}
    color={status === 'success' ? 'white' : colors.error}
    {...props}
  />
)

function getStatusProps(status) {
  switch (status) {
    case 'success':
      return {
        color: colors.neutralTitle,
        title: 'All check have passed',
        paragraph: '1 successful check',
        iconProps: {},
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
          ping: 'true',
        },
        checkParagraph: '— In Progress...',
      }

    default:
      return {
        color: colors.error,
        title: 'Some checks were not successful',
        paragraph: '1 failing check',
        iconProps: {
          as: FaTimes,
          color: colors.error,
          w: '10px',
        },
        checkParagraph: '— 1 difference detected, waiting for your decision',
      }
  }
}

const PingIcon = (props) => (
  <x.div display="flex" justifyContent="center">
    <x.span
      animation="ping"
      position="absolute"
      borderRadius="full"
      opacity={0.75}
      {...props}
      as="span"
    />
    <x.div transition="1000ms" mx="auto" {...props} />
  </x.div>
)

export const GithubMergeStatus = ({ status = 'pending', ...props }) => {
  const { color, title, paragraph, iconProps, checkParagraph } =
    getStatusProps(status)

  const { ping, ...icon } = iconProps

  return (
    <x.div
      borderRadius="6px"
      border="1px solid"
      borderColor={colors.border}
      zIndex={100}
      transition="opacity 800ms 300ms"
      boxShadow="md"
      {...props}
    >
      <BlackContainer borderRadius="6px 6px 0 0">
        <x.div display="flex" justifyContent="space-between" w={1}>
          <x.div display="flex" gap="10px">
            {status !== 'success' ? (
              <Circle color={color} />
            ) : (
              <GreenCheckIcon />
            )}
            <div>
              <Title color={color}>{title}</Title>
              <Paragraph>{paragraph}</Paragraph>
            </div>
          </x.div>
          {/* <LinkButton display={{ _: 'none', md: 'block' }}>
            Hide all checks
          </LinkButton> */}
        </x.div>
      </BlackContainer>

      {status !== 'success' ? (
        <CheckRow>
          <CheckPart>
            <CheckStatus>
              {ping ? (
                <PingIcon {...icon} />
              ) : (
                <x.div mx="auto" transition="1000ms" {...icon} />
              )}
            </CheckStatus>

            <CheckPicture mr="8px">
              <Image
                src={logo}
                width="20px"
                minW="20px"
                height="20px"
                minH="20px"
                alt="@argos-ci"
              />
            </CheckPicture>

            <Paragraph>
              <x.span color={colors.text}>argos</x.span> {checkParagraph}
            </Paragraph>
          </CheckPart>

          <CheckPart>
            <LinkButton ml="10px">Details</LinkButton>
          </CheckPart>
        </CheckRow>
      ) : null}

      {/* <BlackContainer>
        <GreenCheckIcon />
        <x.div>
          <Title color={colors.neutralTitle}>
            This branch has no conflicts with the base branch
          </Title>
          <Paragraph>Merging can be performed automatically.</Paragraph>
        </x.div>
      </BlackContainer> */}

      <x.div
        p="16px"
        bg={colors.backgroundLight}
        borderRadius="0 0 6px 6px"
        borderTop={1}
        borderColor={colors.border}
      >
        <x.div display="flex" alignItems="center">
          <LeftButton status={status}>Merge pull request</LeftButton>
          <RightButton status={status}>
            <x.div as={IoCaretDownSharp} mb="-3px" w="10px" />
          </RightButton>
        </x.div>
        {/* <x.div
          color={colors.text}
          fontSize="12px"
          lineHeight="18px"
          mt="8px"
          ml="4px"
        >
          You can also <Link>open this in GitHub Desktop</Link> or view{' '}
          <Link>command line instructions</Link>.
        </x.div> */}
      </x.div>
    </x.div>
  )
}

export const GithubClickableStatus = (props) => {
  const [githubStatus, setGithubStatus] = useState('error')

  return (
    <x.div h={260} {...props}>
      <Button
        mb={4}
        onClick={() => setGithubStatus('success')}
        disabled={githubStatus === 'success'}
      >
        Approve screenshot diffs
      </Button>
      <GithubMergeStatus status={githubStatus} mb={3} maxW={700} />
    </x.div>
  )
}
