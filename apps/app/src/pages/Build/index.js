import React, { useState } from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { useInView } from "react-cool-inview";
import {
  Container,
  IllustratedText,
  LoadingAlert,
  PrimaryTitle,
  SecondaryTitle,
  ToggleGroupButtons,
} from "@argos-ci/app/src/components";
import { Query } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  UpdateStatusButton,
  UpdateStatusButtonFragment,
} from "./UpdateStatusButton";
import { FileDiffIcon, ChecklistIcon } from "@primer/octicons-react";
import { getVariantColor } from "../../modules/utils";
import {
  StickySummaryMenu,
  SummaryCard,
  SummaryCardBuildFragment,
  SummaryCardRepositoryFragment,
} from "./SummaryCard";
import {
  EmptyScreenshotCard,
  ScreenshotsDiffCard,
  ScreenshotsDiffCardFragment,
} from "./ScreenshotsDiffCard";

const BUILD_QUERY = gql`
  query Build(
    $buildNumber: Int!
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      ...SummaryCardRepositoryFragment
      build(number: $buildNumber) {
        id
        screenshotDiffs {
          id
          score
          ...ScreenshotsDiffCardFragment
        }
        ...SummaryCardBuildFragment
        ...UpdateStatusButtonFragment
      }
    }
  }

  ${SummaryCardRepositoryFragment}
  ${SummaryCardBuildFragment}
  ${UpdateStatusButtonFragment}
  ${ScreenshotsDiffCardFragment}
`;

function BuildChanges({ updatedScreenshots, stableScreenshots, ...props }) {
  return (
    <x.div
      display="flex"
      alignItems="flex-start"
      gap={3}
      pt="6px"
      flexShrink={0}
      {...props}
    >
      <IllustratedText icon={FileDiffIcon} color={getVariantColor("warning")}>
        {updatedScreenshots.length}
      </IllustratedText>
      <IllustratedText icon={ChecklistIcon} color={getVariantColor("success")}>
        {stableScreenshots.length}
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

export function Build() {
  const { ownerLogin, repositoryName, buildNumber } = useParams();
  const [showStableScreenshots, setShowStableScreenshots] = useState(false);
  const { observe, inView } = useInView();

  return (
    <Container>
      <Helmet>
        <title>{`Build #${buildNumber} • ${repositoryName}`}</title>
      </Helmet>

      <Query
        query={BUILD_QUERY}
        variables={{
          ownerLogin,
          repositoryName,
          buildNumber: Number(buildNumber),
        }}
        fallback={<LoadingAlert />}
        skip={!ownerLogin || !repositoryName || buildNumber === undefined}
      >
        {(data) => {
          if (!data?.repository?.build) return <NotFound />;

          const { build } = data.repository;
          const updatedScreenshots = build.screenshotDiffs.filter(
            ({ score }) => score !== 0
          );
          const stableScreenshots = build.screenshotDiffs.filter(
            ({ score }) => score === 0
          );

          return (
            <>
              <x.div
                display="flex"
                justifyContent="space-between"
                alignItems="baseline"
                columnGap={10}
                flexWrap="wrap"
                mb={3}
              >
                <PrimaryTitle mb={0}>
                  Build #{Number(buildNumber).toLocaleString()}
                </PrimaryTitle>
                <BuildChanges
                  updatedScreenshots={updatedScreenshots}
                  stableScreenshots={stableScreenshots}
                />
              </x.div>

              <SummaryCard repository={data.repository} build={build} />

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

              {inView ? null : (
                <StickySummaryMenu repository={data.repository} build={build} />
              )}

              <SecondaryTitle mt={4}>Updated screenshots</SecondaryTitle>
              <ScreenshotCards screenshotsDiffs={updatedScreenshots} open />

              {showStableScreenshots ? (
                <>
                  <SecondaryTitle mt={6}>Stable Screenshots</SecondaryTitle>
                  <ScreenshotCards screenshotsDiffs={stableScreenshots} />
                </>
              ) : null}
            </>
          );
        }}
      </Query>
    </Container>
  );
}
