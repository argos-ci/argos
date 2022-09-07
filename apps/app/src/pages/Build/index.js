import * as React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
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
import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { getStatusPrimaryColor } from "../../containers/Status";
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
import { ScreenshotDiffStatusIcon } from "./ScreenshotDiffStatusIcons";

const ScreenshotDiffsPageFragment = gql`
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

const BUILD_STABLE_SCREENSHOT_DIFFS_QUERY = gql`
  query BUILD_STABLE_SCREENSHOT_DIFFS_QUERY(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
    $offset: Int!
    $limit: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        screenshotDiffs(
          offset: $offset
          limit: $limit
          where: { passing: true }
        ) {
          ...ScreenshotDiffsPageFragment
        }
      }
    }
  }

  ${ScreenshotDiffsPageFragment}
`;

const BUILD_QUERY = gql`
  query BUILD_QUERY(
    $buildNumber: Int!
    $ownerLogin: String!
    $repositoryName: String!
    $offset: Int!
    $limit: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      ...UpdateStatusButtonRepositoryFragment
      build(number: $buildNumber) {
        id
        ...SummaryCardFragment
        ...UpdateStatusButtonBuildFragment
        screenshotDiffs(
          where: { passing: false }
          offset: $offset
          limit: $limit
        ) {
          ...ScreenshotDiffsPageFragment
        }
        stats {
          addedScreenshotCount
          stableScreenshotCount
          updatedScreenshotCount
        }
      }
    }
  }

  ${UpdateStatusButtonRepositoryFragment}
  ${SummaryCardFragment}
  ${ScreenshotDiffsPageFragment}
  ${UpdateStatusButtonBuildFragment}
`;

function BuildStat({ type, count }) {
  if (count === 0) return null;

  return (
    <IllustratedText
      icon={ScreenshotDiffStatusIcon(type)}
      color={getStatusPrimaryColor(type)}
    >
      {count}
    </IllustratedText>
  );
}

export function ScreenshotCards({ screenshotDiffs, open }) {
  if (screenshotDiffs.length === 0) return <EmptyScreenshotCard />;

  return (
    <x.div display="flex" flexDirection="column" gap={2}>
      {screenshotDiffs.map((screenshotDiff, index) => (
        <ScreenshotsDiffCard
          screenshotDiff={screenshotDiff}
          key={index}
          opened={open}
        />
      ))}
    </x.div>
  );
}

function fetchMoreScreenshotDiffs({ data, fetchMore }) {
  return fetchMore({
    variables: {
      offset: data.repository.build.screenshotDiffs.pageInfo.endCursor,
    },
    updateQuery: (prev, { fetchMoreResult }) => {
      if (!fetchMoreResult) return prev;

      return {
        ...prev,
        repository: {
          ...prev.repository,
          build: {
            ...prev.repository.build,
            screenshotDiffs: {
              ...fetchMoreResult.repository.build.screenshotDiffs,
              edges: [
                ...prev.repository.build.screenshotDiffs.edges,
                ...fetchMoreResult.repository.build.screenshotDiffs.edges,
              ],
            },
          },
        },
      };
    },
  });
}

export function StableScreenshots({ ownerLogin, repositoryName, buildNumber }) {
  const { loading, data, fetchMore } = useQuery(
    BUILD_STABLE_SCREENSHOT_DIFFS_QUERY,
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

  function loadNextPage() {
    setMoreLoading(true);
    fetchMoreScreenshotDiffs({ data, fetchMore }).finally(() => {
      setMoreLoading(false);
    });
  }

  if (loading || !data) return <LoadingAlert />;

  const {
    build: {
      screenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = data.repository;

  return (
    <>
      <ScreenshotCards screenshotDiffs={screenshotDiffs} open={false} />

      {pageInfo.hasNextPage && (
        <Button
          mt={4}
          mx="auto"
          onClick={() => loadNextPage()}
          disabled={moreLoading}
        >
          Load More {moreLoading && <Loader maxH={4} />}
        </Button>
      )}
    </>
  );
}

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
  const [showStableScreenshots, setShowStableScreenshots] =
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

  function loadNextPage() {
    setMoreLoading(true);
    fetchMoreScreenshotDiffs({ data, fetchMore }).finally(() => {
      setMoreLoading(false);
    });
  }

  if (loading) return <LoadingAlert />;
  if (!data?.repository?.build) return <NotFound />;
  const {
    build,
    build: {
      stats,
      screenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = data.repository;

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

        <x.div
          display="flex"
          alignItems="flex-start"
          gap={3}
          pt="6px"
          flexShrink={0}
        >
          <BuildStat type="added" count={stats.addedScreenshotCount} />
          <BuildStat type="updated" count={stats.updatedScreenshotCount} />
          <BuildStat type="stable" count={stats.stableScreenshotCount} />
        </x.div>
      </x.div>

      <SummaryCard repository={data.repository} build={build} />

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
            <Button
              borderRadius="md"
              variant="neutral"
              onClick={() => setShowStableScreenshots((prev) => !prev)}
              justifyContent="start"
            >
              <IllustratedText
                icon={showStableScreenshots ? EyeClosedIcon : EyeIcon}
                field
              >
                {showStableScreenshots ? "Hide" : "Show"} stable screenshots
              </IllustratedText>
            </Button>

            <UpdateStatusButton repository={data.repository} build={build} />
          </x.div>

          {inView ? null : (
            <StickySummaryMenu repository={data.repository} build={build} />
          )}

          {showStableScreenshots ? (
            <>
              <SecondaryTitle mt={4}>Stable Screenshots</SecondaryTitle>
              <StableScreenshots
                ownerLogin={ownerLogin}
                repositoryName={repositoryName}
                buildNumber={buildNumber}
              />
            </>
          ) : null}

          <SecondaryTitle mt={4}>Updated screenshots</SecondaryTitle>
          <ScreenshotCards screenshotDiffs={screenshotDiffs} />

          {pageInfo.hasNextPage && (
            <Button
              mt={4}
              mx="auto"
              onClick={() => loadNextPage()}
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
