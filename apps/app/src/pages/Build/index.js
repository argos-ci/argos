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
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
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
import { ScreenshotDiffStatusIcon } from "./ScreenshotDiffStatusIcons";
import {
  BuildStatusBadge,
  BuildStatusBadgeFragment,
} from "../../containers/BuildStatusBadge";
import {
  fetchMoreScreenshotDiffs,
  LoadMoreButton,
  ScreenshotDiffsPageFragment,
  ScreenshotDiffsSection,
} from "./ScreenshotDiffsSection";
import { StableScreenshots } from "./StableScreenshotDiffs";

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
          pageInfo {
            totalCount
          }
          ...ScreenshotDiffsPageFragment
        }

        stats {
          failedScreenshotCount
          addedScreenshotCount
          stableScreenshotCount
          updatedScreenshotCount
          removedScreenshotCount
          screenshotCount
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

function NoChangeCard({ totalScreenshotCount }) {
  return (
    <Card mt={4}>
      <CardHeader>
        <CardTitle>
          {totalScreenshotCount === 0 ? "Empty build" : "Stable build"}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <CardText fontSize="md">
          {totalScreenshotCount === 0
            ? "This build does not have any screenshot to compare."
            : "This build is stable. No change detected."}
        </CardText>
      </CardBody>
    </Card>
  );
}

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

  const { loading, data, fetchMore, startPolling, stopPolling } = useQuery(
    BUILD_QUERY,
    {
      variables: {
        ownerLogin,
        repositoryName,
        buildNumber,
        offset: 0,
        limit: 10,
      },
      skip: !ownerLogin || !repositoryName || !buildNumber,
      pollInterval: 1000,
    }
  );

  const inProgress =
    data?.repository?.build?.status &&
    (data.repository.build.status === "pending" ||
      data.repository.build.status === "progress");

  React.useEffect(() => {
    if (inProgress) {
      startPolling(1000);
    } else {
      stopPolling();
    }
  }, [stopPolling, startPolling, inProgress]);

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
      [screenshotDiff.status]: groups[screenshotDiff.status]
        ? [...groups[screenshotDiff.status], screenshotDiff]
        : [screenshotDiff],
    }),
    { added: [], updated: [], failed: [], removed: [] }
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
          <BuildStatusBadge build={build} />
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
            status="removed"
            count={stats.removedScreenshotCount}
            label="Removed screenshots"
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

      {inProgress ? (
        <LoadingAlert my={5} flexDirection="column">
          {getBuildStatusLabel({ build })}
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

            {pageInfo.totalCount !== 0 ? (
              <UpdateStatusButton repository={data.repository} build={build} />
            ) : null}
          </x.div>

          {inView ? null : (
            <StickySummaryMenu
              repository={data.repository}
              build={build}
              screenshotDiffsCount={pageInfo.totalCount}
            />
          )}

          {showStableScreenshots ? (
            <StableScreenshots
              ownerLogin={ownerLogin}
              repositoryName={repositoryName}
              buildNumber={buildNumber}
            />
          ) : null}

          {pageInfo.totalCount === 0 ? (
            <NoChangeCard totalScreenshotCount={stats.screenshotCount} />
          ) : null}

          <ScreenshotDiffsSection
            title="Failure Screenshots"
            screenshotDiffs={diffGroups.failed}
            color={getStatusPrimaryColor("danger")}
          />
          <ScreenshotDiffsSection
            title="Added Screenshots"
            screenshotDiffs={diffGroups.added}
          />
          <ScreenshotDiffsSection
            title="Removed Screenshots"
            screenshotDiffs={diffGroups.removed}
            opened={false}
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
