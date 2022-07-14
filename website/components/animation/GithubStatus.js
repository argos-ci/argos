import { Image } from '@components/Image'
import { Paragraph } from '@components/Paragraph'
import { x } from '@xstyled/styled-components'
import {
  getGithubStatusProps,
  GithubBlackContainer,
  GithubCheckPart,
  GithubCheckPicture,
  GithubCheckRow,
  GithubCheckStatus,
  GithubCircle,
  GITHUB_COLORS,
  GithubGreenCheckIcon,
  GithubLeftButton,
  GithubLinkButton,
  GithubParagraph,
  GithubPingIcon,
  GithubTitle,
} from '../Github'
import logo from '@images/logo.png'

export const GithubMergeStatus = ({
  status = 'pending',
  detailsButtonRef,
  ...props
}) => {
  const { color, title, paragraph, iconProps, checkParagraph, titleColor } =
    getGithubStatusProps(status)

  const { ping, ...icon } = iconProps

  return (
    <x.div
      borderRadius="6px"
      border="1px solid"
      borderColor="border"
      zIndex={100}
      transition="opacity 800ms 300ms"
      boxShadow="md"
      {...props}
    >
      <GithubBlackContainer borderRadius="6px 6px 0 0">
        <x.div display="flex" justifyContent="space-between" w={1}>
          <x.div display="flex" gap="10px">
            {status !== 'success' ? (
              <GithubCircle color={color} />
            ) : (
              <GithubGreenCheckIcon />
            )}
            <div>
              <GithubTitle color={titleColor}>{title}</GithubTitle>
              <GithubParagraph>{paragraph}</GithubParagraph>
            </div>
          </x.div>
        </x.div>
      </GithubBlackContainer>

      <GithubCheckRow>
        <GithubCheckPart>
          <GithubCheckStatus>
            {ping ? (
              <GithubPingIcon {...icon} />
            ) : (
              <x.div mx="auto" transition="1000ms" {...icon} />
            )}
          </GithubCheckStatus>

          <GithubCheckPicture mr="8px">
            <Image
              src={logo}
              width="20px"
              minW="20px"
              height="20px"
              minH="20px"
              alt="@argos-ci"
            />
          </GithubCheckPicture>

          <Paragraph>
            <x.span color={GITHUB_COLORS.text}>argos</x.span> — {checkParagraph}
          </Paragraph>
        </GithubCheckPart>

        <GithubCheckPart>
          <GithubLinkButton ml="10px" ref={detailsButtonRef}>
            Details
          </GithubLinkButton>
        </GithubCheckPart>
      </GithubCheckRow>

      <x.div
        p="16px"
        bg={GITHUB_COLORS.backgroundLight}
        borderRadius="0 0 6px 6px"
        borderTop={1}
        borderColor="border"
      >
        <GithubLeftButton status={status}>Merge pull request</GithubLeftButton>
      </x.div>
    </x.div>
  )
}
