import { forwardRef } from "react";
import { x } from "@xstyled/styled-components";
import { FaCheck, FaTimes } from "react-icons/fa";
import { Image } from "@components/Image";
import logo from "@images/logo.png";

export const GITHUB_COLORS = {
  link: "#58a6ff",
  text: "#c9d1d9",
  neutralTitle: "#f0f6fc",
  paragraph: "#8b949e",
  backgroundLight: "#161b22",
};

export const GithubLinkButton = forwardRef((props, ref) => (
  <x.div
    color={GITHUB_COLORS.link}
    fontSize="13px"
    lineHeight="18.2px"
    whiteSpace="nowrap"
    ref={ref}
    {...props}
  />
));

export const GithubCheckRow = (props) => (
  <x.div
    color={GITHUB_COLORS.text}
    word-wrap="break-word"
    justifyContent="space-between"
    font-size="13px"
    line-height="1.4"
    alignItems="center"
    display="flex"
    padding="8px 16px"
    border="solid"
    borderWidth="1px 0 0"
    borderColor="border"
    bg={GITHUB_COLORS.backgroundLight}
    {...props}
  />
);
export const GithubCheckPart = (props) => (
  <x.div display="flex" overflow="hidden" alignItems="center" {...props} />
);
export const GithubCheckStatus = (props) => (
  <x.div mt="2px" w="30px" minW="30px" {...props} />
);
export const GithubCheckText = (props) => (
  <x.div
    color="secondary"
    fontSize="13px"
    textOverflow="ellipsis"
    whiteSpace="nowrap"
    overflow="hidden"
    {...props}
  />
);
export const GithubCheckPicture = (props) => (
  <x.div
    backgroundColor="white"
    borderRadius="6px"
    h="20px"
    w="20px"
    {...props}
  />
);

export const GithubBlackContainer = (props) => (
  <x.div
    p="16px"
    display="flex"
    gap="10px"
    color={GITHUB_COLORS.text}
    backgroundColor="black"
    {...props}
  />
);
export const GithubCircle = ({ color = "error", ...props }) => (
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
);
export const GithubTitle = (props) => (
  <x.div
    fontWeight="600"
    fontSize="16px"
    lineHeight="1.4"
    mb="1px"
    transition="1000ms"
    {...props}
  />
);

export const GithubParagraph = (props) => (
  <x.div
    fontWeight="400"
    fontSize="13px"
    lineHeight="18.2px"
    transition="1000ms"
    color={GITHUB_COLORS.paragraph}
    {...props}
  />
);

export const GithubGreenCheckIcon = (props) => (
  <x.div
    w="30px"
    h="30px"
    backgroundColor="success"
    borderRadius="50%"
    display="flex"
    justifyContent="center"
    alignItems="center"
    {...props}
  >
    <x.div as={FaCheck} color="white" w="14px" />
  </x.div>
);

export const GithubBaseButton = ({ status, ...props }) => (
  <x.div
    padding="13.5px"
    fontSize="14px"
    fontWeight="500"
    lineHeight="20px"
    border="solid"
    borderWidth="1px 1px 1px 1px"
    color={status === "success" ? "white" : "rgba(248, 81, 73, 0.5)"}
    backgroundColor={status === "success" ? "success" : "#0d1117"}
    borderColor="rgba(240, 246, 252, 0.1)"
    display="flex"
    alignItems="center"
    h="32px"
    {...props}
  />
);

export const GithubLeftButton = (props) => (
  <x.div
    as={GithubBaseButton}
    borderWidth="1px"
    borderRadius="6px"
    maxW="160px"
    {...props}
  />
);

export function getGithubStatusProps(status) {
  switch (status) {
    case "success":
      return {
        color: "success",
        titleColor: GITHUB_COLORS.neutralTitle,
        title: "All check have passed",
        paragraph: "1 successful check",
        iconProps: {
          as: FaCheck,
          color: "success",
          w: "10px",
        },
        checkParagraph: "Everything’s good!",
      };
    case "pending":
      return {
        color: "warning",
        titleColor: "warning",
        title: "Some checks haven't completed yet",
        paragraph: "1 pending check",
        iconProps: {
          borderRadius: "50%",
          w: "10px",
          h: "10px",
          mt: "2px",
          backgroundColor: "warning",
          ping: "true",
        },
        checkParagraph: "In Progress...",
      };

    default:
      return {
        color: "danger",
        titleColor: "danger",
        title: "Some checks were not successful",
        paragraph: "1 failing check",
        iconProps: {
          as: FaTimes,
          color: "danger",
          w: "10px",
        },
        checkParagraph: "1 difference detected, waiting for your decision",
      };
  }
}

export const GithubPingIcon = (props) => (
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
);

export const GithubMergeStatus = ({
  status = "pending",
  detailsButtonRef,
  ...props
}) => {
  const { color, title, paragraph, iconProps, checkParagraph, titleColor } =
    getGithubStatusProps(status);

  const { ping, ...icon } = iconProps;

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
            {status !== "success" ? (
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

          <GithubCheckText>
            <x.span color={GITHUB_COLORS.text}>argos</x.span> — {checkParagraph}
          </GithubCheckText>
        </GithubCheckPart>

        <GithubLinkButton ml="10px" ref={detailsButtonRef}>
          Details
        </GithubLinkButton>
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
  );
};
