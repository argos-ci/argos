import React, { useState } from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { useInView } from "react-cool-inview";
import {
  Container,
  IllustratedText,
  Link,
  LoadingAlert,
  PrimaryTitle,
  SecondaryTitle,
  ToggleGroupButtons,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import { useRepository } from "../../containers/RepositoryContext";
import { UpdateStatusButton } from "./UpdateStatusButton";
import { FileDiffIcon, ChecklistIcon } from "@primer/octicons-react";
import { getVariantColor } from "../../modules/utils";
import { SummaryCard } from "./SummaryCard";
import {
  EmptyScreenshotCard,
  ScreenshotsDiffCard,
} from "./ScreenshotsDiffCard";
import { GoGitBranch } from "react-icons/go";

export const BuildContextFragment = gql`
  fragment BuildContextFragment on Build {
    id
    createdAt
    number
    status
    repository {
      name
      owner {
        login
      }
    }
    baseScreenshotBucket {
      id
      createdAt
      updatedAt
      name
      commit
      branch
    }
    compareScreenshotBucket {
      id
      createdAt
      updatedAt
      name
      commit
      branch
    }
    screenshotDiffs {
      id
      createdAt
      updatedAt
      baseScreenshot {
        id
        name
        url
      }
      compareScreenshot {
        id
        name
        url
      }
      url
      score
      jobStatus
      validationStatus
    }
  }
`;

const BUILD_QUERY = gql`
  query Build(
    $buildNumber: Int!
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        id
        number
        ...BuildContextFragment
      }
    }
  }

  ${BuildContextFragment}
`;

function BuildChanges({ build, ...props }) {
  const passingScreenshotCount = build.screenshotDiffs.filter(
    ({ score }) => score === 0
  ).length;
  const diffScreenshotCount = build.screenshotDiffs.filter(
    ({ score }) => score !== 0
  ).length;

  return (
    <x.div
      display="flex"
      gap={3}
      alignItems="flex-start"
      pt="6px"
      flexShrink={0}
      {...props}
    >
      <IllustratedText icon={FileDiffIcon} color={getVariantColor("warning")}>
        {diffScreenshotCount}
      </IllustratedText>
      <IllustratedText icon={ChecklistIcon} color={getVariantColor("success")}>
        {passingScreenshotCount}
      </IllustratedText>
    </x.div>
  );
}

export function ScreenshotCards({ screenshotsDiffs, open }) {
  if (screenshotsDiffs.length === 0) <EmptyScreenshotCard />;

  return (
    <x.div display="flex" flexDirection="column" gap={2}>
      {screenshotsDiffs.map((screenshotDiff, index) => (
        <ScreenshotsDiffCard
          screenshotDiff={screenshotDiff}
          key={index}
          open={open}
        />
      ))}
    </x.div>
  );
}

export function StickyMenu({ children, build, ...props }) {
  const githubRepoUrl = `https://github.com/${build.repository.owner.login}/${build.repository.name}`;

  return (
    <x.div
      position="sticky"
      top={0}
      zIndex={200}
      backgroundColor="background"
      borderLeft={3}
      borderColor={getVariantColor(build.status)}
      {...props}
    >
      <x.div
        display="flex"
        justifyContent="space-between"
        px={2}
        py={1}
        gap={4}
      >
        <IllustratedText icon={GoGitBranch}>
          <Link
            href={`${githubRepoUrl}/${build.compareScreenshotBucket.branch}`}
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            overflow="hidden"
          >
            {build.compareScreenshotBucket.branch}
          </Link>
        </IllustratedText>
        <UpdateStatusButton build={build} flex={1} />
      </x.div>
    </x.div>
  );
}

export function Build() {
  const { repository } = useRepository();
  const { buildNumber } = useParams();
  const { loading, data } = useQuery(BUILD_QUERY, {
    variables: {
      ownerLogin: repository.owner.login,
      repositoryName: repository.name,
      buildNumber: Number(buildNumber),
    },
  });
  const [showStableScreenshots, setShowStableScreenshots] = useState(false);
  const { observe, inView } = useInView();

  if (loading) {
    return (
      <Container>
        <LoadingAlert />
      </Container>
    );
  }

  if (!data.repository || !data.repository.build) return <NotFound />;

  const { build } = data.repository;

  const updatedScreenshots = build.screenshotDiffs.filter(
    ({ score }) => score !== 0
  );
  const stableScreenshots = build.screenshotDiffs.filter(
    ({ score }) => score === 0
  );

  return (
    <Container>
      <Helmet>
        <title>{`Build #${build.number}`}</title>
      </Helmet>

      <x.div
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        columnGap={10}
        flexWrap="wrap"
        mb={3}
      >
        <PrimaryTitle mb={0}>
          Build #{build.number.toLocaleString()}
        </PrimaryTitle>
        <BuildChanges build={build} />
      </x.div>

      <SummaryCard repository={repository} build={build} />

      <x.div
        display="flex"
        justifyContent="space-between"
        columnGap={10}
        rowGap={2}
        flexWrap="wrap"
        mt={5}
        ref={observe}
      >
        <ToggleGroupButtons
          state={showStableScreenshots}
          setState={setShowStableScreenshots}
          switchOnText="Show differences only"
          switchOffText="Show all"
        />
        <UpdateStatusButton build={build} />
      </x.div>

      {inView ? null : <StickyMenu build={build} />}

      <SecondaryTitle mt={4}>Updated screenshots</SecondaryTitle>
      <ScreenshotCards screenshotsDiffs={updatedScreenshots} open />

      {showStableScreenshots ? (
        <>
          <SecondaryTitle mt={6}>Stable Screenshots</SecondaryTitle>
          <ScreenshotCards screenshotsDiffs={stableScreenshots} />
        </>
      ) : null}
    </Container>
  );
}
