import * as React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Group } from "ariakit/group";
import { Helmet } from "react-helmet";
import { useInView } from "react-cool-inview";
import {
  Button,
  Container,
  IllustratedText,
  LoadingAlert,
  PrimaryTitle,
  SecondaryTitle,
} from "@argos-ci/app/src/components";
import { Query } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  UpdateStatusButton,
  UpdateStatusButtonBuildFragment,
  UpdateStatusButtonRepositoryFragment,
} from "./UpdateStatusButton";
import {
  FileDiffIcon,
  ChecklistIcon,
  FileAddedIcon,
} from "@primer/octicons-react";
import { getStatusColor } from "../../containers/Status";
import {
  StickySummaryMenu,
  SummaryCard,
  SummaryCardFragment,
} from "./SummaryCard";
import {
  EmptyScreenshotCard,
  ScreenshotsDiffCard,
  ScreenshotsDiffCardFragment,
} from "./ScreenshotsDiffCard";

const BUILD_PASSING_SCREENSHOT_DIFFS = gql`
  query BUILD_PASSING_SCREENSHOT_DIFFS(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
  ) {
    build(
      ownerLogin: $ownerLogin
      repositoryName: $repositoryName
      number: $buildNumber
    ) {
      id

      screenshotDiffs {
        id
        score
        ...ScreenshotsDiffCardFragment
      }
    }
  }

  ${ScreenshotsDiffCardFragment}
`;

const BUILD_QUERY = gql`
  query BUILD_QUERY(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
  ) {
    build(
      ownerLogin: $ownerLogin
      repositoryName: $repositoryName
      number: $buildNumber
    ) {
      id
      stats {
        createdScreenshotCount
        updatedScreenshotCount
        passingScreenshotCount
      }

      screenshotDiffs(showPassing: false) {
        id
        score
        ...ScreenshotsDiffCardFragment
      }

      repository {
        id
        ...UpdateStatusButtonRepositoryFragment
      }

      ...SummaryCardFragment
      ...UpdateStatusButtonBuildFragment
    }
  }

  ${UpdateStatusButtonRepositoryFragment}
  ${SummaryCardFragment}
  ${ScreenshotsDiffCardFragment}
  ${UpdateStatusButtonBuildFragment}
`;

function BuildStats({
  stats: {
    updatedScreenshotCount,
    passingScreenshotCount,
    createdScreenshotCount,
  },
}) {
  return (
    <x.div
      display="flex"
      alignItems="flex-start"
      gap={3}
      pt="6px"
      flexShrink={0}
    >
      {createdScreenshotCount > 0 && (
        <IllustratedText icon={FileAddedIcon} color={getStatusColor("neutral")}>
          {createdScreenshotCount}
        </IllustratedText>
      )}
      {updatedScreenshotCount > 0 && (
        <IllustratedText icon={FileDiffIcon} color={getStatusColor("warning")}>
          {updatedScreenshotCount}
        </IllustratedText>
      )}
      {passingScreenshotCount > 0 && (
        <IllustratedText icon={ChecklistIcon} color={getStatusColor("success")}>
          {passingScreenshotCount}
        </IllustratedText>
      )}
    </x.div>
  );
}

export function ScreenshotCards({ screenshotsDiffs, open }) {
  if (screenshotsDiffs.length === 0) return <EmptyScreenshotCard />;

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

export function PassingScreenshots({
  ownerLogin,
  repositoryName,
  buildNumber,
}) {
  return (
    <Query
      query={BUILD_PASSING_SCREENSHOT_DIFFS}
      variables={{ ownerLogin, repositoryName, buildNumber }}
      fallback={<LoadingAlert />}
      skip={!ownerLogin || !repositoryName || !buildNumber}
    >
      {(data) => (
        <ScreenshotCards
          screenshotsDiffs={data.build.screenshotDiffs}
          open={false}
        />
      )}
    </Query>
  );
}

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
  const [showStableScreenshots, setShowStableScreenshots] =
    React.useState(false);
  const { observe, inView } = useInView();

  return (
    <Query
      query={BUILD_QUERY}
      variables={{ ownerLogin, repositoryName, buildNumber }}
      fallback={<LoadingAlert />}
      skip={!ownerLogin || !repositoryName || !buildNumber}
    >
      {(data) => {
        if (!data?.build) return <NotFound />;

        const { build } = data;

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
              <PrimaryTitle mb={0}>Build #{buildNumber}</PrimaryTitle>
              <BuildStats stats={build.stats} />
            </x.div>

            <SummaryCard repository={build.repository} build={build} />

            {build.status === "pending" ? (
              <LoadingAlert my={5} flexDirection="column">
                Build in progress
              </LoadingAlert>
            ) : (
              <>
                <x.div
                  display="flex"
                  justifyContent="space-between"
                  columnGap={10}
                  rowGap={4}
                  flexWrap="wrap-reverse"
                  mt={5}
                  ref={observe}
                >
                  <x.div
                    as={Group}
                    display="flex"
                    overflowX="scroll"
                    alignItems="start"
                  >
                    <Button
                      borderRadius="md 0 0 md"
                      variant="neutral"
                      disabled={!showStableScreenshots}
                      onClick={() => setShowStableScreenshots(false)}
                    >
                      Updated screenshots only
                    </Button>
                    <Button
                      borderRadius="0 md md 0"
                      variant="neutral"
                      disabled={showStableScreenshots}
                      onClick={() => setShowStableScreenshots(true)}
                    >
                      Show all
                    </Button>
                  </x.div>

                  <UpdateStatusButton
                    repository={build.repository}
                    build={build}
                  />
                </x.div>

                {inView ? null : (
                  <StickySummaryMenu
                    repository={build.repository}
                    build={build}
                  />
                )}

                <SecondaryTitle mt={4}>Updated screenshots</SecondaryTitle>
                <ScreenshotCards screenshotsDiffs={build.screenshotDiffs} />

                {showStableScreenshots ? (
                  <>
                    <SecondaryTitle mt={6}>Stable Screenshots</SecondaryTitle>
                    <PassingScreenshots
                      ownerLogin={ownerLogin}
                      repositoryName={repositoryName}
                      buildNumber={buildNumber}
                    />
                  </>
                ) : null}
              </>
            )}
          </>
        );
      }}
    </Query>
  );
};

export function Build() {
  const {
    ownerLogin,
    repositoryName,
    buildNumber: strBuildNumber,
  } = useParams();

  const buildNumber = parseInt(strBuildNumber, 10);

  return (
    <Container>
      <Helmet>
        <title>{`Build #${buildNumber} - ${repositoryName}`}</title>
      </Helmet>
      {Number.isInteger(buildNumber) ? (
        <BuildContent
          ownerLogin={ownerLogin}
          repositoryName={repositoryName}
          buildNumber={buildNumber}
        />
      ) : (
        <NotFound />
      )}
    </Container>
  );
}
