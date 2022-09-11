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
  useTooltipState,
  TooltipAnchor,
  Tooltip,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  UpdateStatusButton,
  UpdateStatusButtonBuildFragment,
  UpdateStatusButtonRepositoryFragment,
} from "./UpdateStatusButton";
import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import {
  getBuildStatusLabel,
  getStatusPrimaryColor,
} from "../../containers/Status";
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
import {
  BuildStatusBadge,
  BuildStatusBadgeFragment,
} from "../../containers/BuildStatusBadge";

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
      status

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
        id
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
        ...BuildStatusBadgeFragment

        screenshotDiffs(
          where: { passing: false }
          offset: $offset
          limit: $limit
        ) {
          ...ScreenshotDiffsPageFragment
        }

        stats {
          failedScreenshotCount
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
  ${BuildStatusBadgeFragment}
`;

function BuildStat({ status, count, label }) {
  const tooltip = useTooltipState();

  if (count === 0) return null;

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IllustratedText
          icon={ScreenshotDiffStatusIcon(status)}
          color={getStatusPrimaryColor(status)}
          cursor="default"
        >
          {count}
        </IllustratedText>
      </TooltipAnchor>
      <Tooltip state={tooltip}>{label}</Tooltip>
    </>
  );
}

function ScreenshotCards({ screenshotDiffs, open }) {
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

function ScreenshotSection({
  title,
  screenshotDiffs,
  color = "primary-text",
  openedCard = "true",
}) {
  if (screenshotDiffs.length === 0) return null;

  return (
    <>
      <SecondaryTitle mt={6} color={color}>
        {title}
      </SecondaryTitle>
      <ScreenshotCards screenshotDiffs={screenshotDiffs} opened={openedCard} />
    </>
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

function StableScreenshots({ ownerLogin, repositoryName, buildNumber }) {
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
      <ScreenshotSection
        title="Stable Screenshots"
        screenshotDiffs={screenshotDiffs}
        openedCard={false}
      />

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

const BuildDetails = ({
  repository,
  moreLoading,
  loadNextPage,
  ownerLogin,
  repositoryName,
  buildNumber,
}) => {
  const {
    build,
    build: {
      stats,
      screenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = repository;

  const { observe, inView } = useInView();

  const [showStableScreenshots, setShowStableScreenshots] =
    React.useState(false);

  const diffGroups = screenshotDiffs.reduce(
    (groups, screenshotDiff) => ({
      ...groups,
      [screenshotDiff.status]: [
        ...groups[screenshotDiff.status],
        screenshotDiff,
      ],
    }),
    { added: [], updated: [], failed: [] }
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
        <x.div display="flex" alignItems="center" gap={3}>
          <PrimaryTitle mb={0}>Build #{buildNumber}</PrimaryTitle>
          <BuildStatusBadge build={build}>
            {getBuildStatusLabel(build.status)}
          </BuildStatusBadge>
        </x.div>

        <x.div
          display="flex"
          alignItems="flex-start"
          gap={3}
          pt="6px"
          flexShrink={0}
        >
          <BuildStat
            status="failed"
            count={stats.failedScreenshotCount}
            label="Failed screenshots"
          />
          <BuildStat
            status="added"
            count={stats.addedScreenshotCount}
            label="Added screenshots"
          />
          <BuildStat
            status="updated"
            count={stats.updatedScreenshotCount}
            label="Updated screenshots"
          />
          <BuildStat
            status="stable"
            count={stats.stableScreenshotCount}
            label="Stable screenshots"
          />
        </x.div>
      </x.div>

      <SummaryCard repository={repository} build={build} />

      {["pending", "progress"].includes(build.status) ? (
        <LoadingAlert my={5} flexDirection="column">
          {getBuildStatusLabel(build.status)}
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
            {stats.stableScreenshotCount > 0 ? (
              <Button
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
            ) : null}

            <UpdateStatusButton repository={repository} build={build} />
          </x.div>

          {inView ? null : (
            <StickySummaryMenu repository={repository} build={build} />
          )}

          {showStableScreenshots ? (
            <StableScreenshots
              ownerLogin={ownerLogin}
              repositoryName={repositoryName}
              buildNumber={buildNumber}
            />
          ) : null}

          <ScreenshotSection
            title="Failure Screenshots"
            screenshotDiffs={diffGroups.failed}
            color={getStatusPrimaryColor("danger")}
          />
          <ScreenshotSection
            title="Added Screenshots"
            screenshotDiffs={diffGroups.added}
          />
          <ScreenshotSection
            title="Updated Screenshots"
            screenshotDiffs={diffGroups.updated}
          />

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

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
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

  return (
    <BuildDetails
      repository={data.repository}
      moreLoading={moreLoading}
      loadNextPage={loadNextPage}
      ownerLogin={ownerLogin}
      repositoryName={repositoryName}
      buildNumber={buildNumber}
    />
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
