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
  LoadingAlert,
  PrimaryTitle,
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
import { getStatusPrimaryColor } from "../../containers/Status";
import {
  StickySummaryMenu,
  SummaryCard,
  SummaryCardFragment,
} from "./SummaryCard";
import { ScreenshotDiffStatusIcon } from "./ScreenshotDiffStatusIcons";
import { StableScreenshots } from "./StableScreenshotDiffs";
import {
  fetchMoreScreenshotDiffs,
  LoadMoreButton,
  ScreenshotDiffsPageFragment,
  ScreenshotDiffsSection,
} from "./PaginateScreenshotDiffsSection";

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
        <PrimaryTitle mb={0}>Build #{buildNumber}</PrimaryTitle>

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

          {showStableScreenshots && (
            <StableScreenshots
              ownerLogin={ownerLogin}
              repositoryName={repositoryName}
              buildNumber={buildNumber}
            />
          )}

          <ScreenshotDiffsSection
            title="Failed Screenshots"
            screenshotDiffs={diffGroups.failed}
            color={getStatusPrimaryColor("danger")}
          />
          <ScreenshotDiffsSection
            title="Added Screenshots"
            screenshotDiffs={diffGroups.added}
          />
          <ScreenshotDiffsSection
            title="Updated Screenshots"
            screenshotDiffs={diffGroups.updated}
          />

          {pageInfo.hasNextPage && (
            <LoadMoreButton onClick={loadNextPage} moreLoading={moreLoading} />
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
