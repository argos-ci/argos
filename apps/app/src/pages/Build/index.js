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
  Loader,
  LoadingAlert,
  PrimaryTitle,
  SecondaryTitle,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
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
  EyeClosedIcon,
  EyeIcon,
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

export const ScreenshotDiffsPageFragment = gql`
  fragment ScreenshotDiffsPageFragment on ScreenshotDiffResult {
    pageInfo {
      totalCount
      hasNextPage
      endCursor
    }
    edges {
      id
      score
      ...ScreenshotsDiffCardFragment
    }
  }

  ${ScreenshotsDiffCardFragment}
`;

const BUILD_PASSING_SCREENSHOT_DIFFS = gql`
  query BUILD_PASSING_SCREENSHOT_DIFFS(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
    $offset: Int!
    $limit: Int!
  ) {
    build(
      ownerLogin: $ownerLogin
      repositoryName: $repositoryName
      number: $buildNumber
    ) {
      id

      passingScreenshotDiffs(offset: $offset, limit: $limit) {
        ...ScreenshotDiffsPageFragment
      }
    }
  }

  ${ScreenshotDiffsPageFragment}
`;

const BUILD_QUERY = gql`
  query BUILD_QUERY(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
    $offset: Int!
    $limit: Int!
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

      screenshotDiffs(filterPassing: true, offset: $offset, limit: $limit) {
        ...ScreenshotDiffsPageFragment
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
  ${ScreenshotDiffsPageFragment}
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

export function ScreenshotCards({ pageInfo, screenshotDiffs, open }) {
  if (pageInfo.totalCount === 0) return <EmptyScreenshotCard />;

  return (
    <x.div display="flex" flexDirection="column" gap={2}>
      {screenshotDiffs.map((screenshotDiff, index) => (
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
  const { loading, data, fetchMore } = useQuery(
    BUILD_PASSING_SCREENSHOT_DIFFS,
    {
      variables: {
        ownerLogin,
        repositoryName,
        buildNumber,
        offset: 0,
        limit: 10,
      },
      skip: !ownerLogin || !repositoryName || !buildNumber,
    }
  );
  const [moreLoading, setMoreLoading] = React.useState();

  function loadMorePassingScreenshotDiffs() {
    setMoreLoading(true);
    fetchMore({
      variables: {
        offset: data.build.passingScreenshotDiffs.pageInfo.endCursor,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...prev,
          build: {
            ...prev.build,
            passingScreenshotDiffs: {
              ...fetchMoreResult.build.passingScreenshotDiffs,
              edges: [
                ...prev.build.passingScreenshotDiffs.edges,
                ...fetchMoreResult.build.passingScreenshotDiffs.edges,
              ],
            },
          },
        };
      },
    }).finally(() => {
      setMoreLoading(false);
    });
  }

  if (loading || !data) return <LoadingAlert />;

  const {
    build: {
      passingScreenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = data;

  return (
    <>
      <ScreenshotCards
        pageInfo={pageInfo}
        screenshotDiffs={screenshotDiffs}
        open={false}
      />

      {pageInfo.hasNextPage && (
        <Button
          mt={4}
          mx="auto"
          onClick={() => loadMorePassingScreenshotDiffs()}
          disabled={moreLoading}
        >
          Load More {moreLoading && <Loader maxH={4} />}
        </Button>
      )}
    </>
  );
}

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
  const [showPassingScreenshots, setShowPassingScreenshots] =
    React.useState(false);
  const { observe, inView } = useInView();

  const { loading, data, fetchMore } = useQuery(BUILD_QUERY, {
    variables: {
      ownerLogin,
      repositoryName,
      buildNumber,
      offset: 0,
      limit: 10,
    },
    skip: !ownerLogin || !repositoryName || !buildNumber,
  });
  const [moreLoading, setMoreLoading] = React.useState();

  function loadMoreScreenshotDiffs() {
    setMoreLoading(true);
    fetchMore({
      variables: { offset: data.build.screenshotDiffs.pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...prev,
          build: {
            ...prev.build,
            screenshotDiffs: {
              ...fetchMoreResult.build.screenshotDiffs,
              edges: [
                ...prev.build.screenshotDiffs.edges,
                ...fetchMoreResult.build.screenshotDiffs.edges,
              ],
            },
          },
        };
      },
    }).finally(() => {
      setMoreLoading(false);
    });
  }

  if (loading) return <LoadingAlert />;
  if (!data?.build) return <NotFound />;
  const {
    build,
    build: {
      screenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = data;

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
                borderRadius="md"
                variant="neutral"
                onClick={() => setShowPassingScreenshots((prev) => !prev)}
                w={260}
                justifyContent="start"
              >
                <IllustratedText
                  icon={showPassingScreenshots ? EyeClosedIcon : EyeIcon}
                  field
                >
                  {showPassingScreenshots ? "Hide" : "Show"} passing screenshots
                </IllustratedText>
              </Button>
            </x.div>

            <UpdateStatusButton repository={build.repository} build={build} />
          </x.div>

          {inView ? null : (
            <StickySummaryMenu repository={build.repository} build={build} />
          )}

          {showPassingScreenshots ? (
            <>
              <SecondaryTitle mt={4}>Passing Screenshots</SecondaryTitle>
              <PassingScreenshots
                ownerLogin={ownerLogin}
                repositoryName={repositoryName}
                buildNumber={buildNumber}
              />
            </>
          ) : null}

          <SecondaryTitle mt={4}>Updated screenshots</SecondaryTitle>
          <ScreenshotCards
            pageInfo={pageInfo}
            screenshotDiffs={screenshotDiffs}
          />

          {pageInfo.hasNextPage && (
            <Button
              mt={4}
              mx="auto"
              onClick={() => loadMoreScreenshotDiffs()}
              disabled={moreLoading}
            >
              Load More {moreLoading && <Loader maxH={4} />}
            </Button>
          )}
        </>
      )}
    </>
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
