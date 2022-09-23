/* eslint-disable react/no-unescaped-entities */
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
  Alert,
  Link,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  ReviewButton,
  ReviewButtonBuildFragment,
  ReviewButtonOwnerFragment,
  ReviewButtonRepositoryFragment,
} from "./ReviewButton";
import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import {
  getBuildStatusLabel,
  getStatusPrimaryColor,
} from "../../containers/Status";
import {
  StickySummaryMenu,
  SummaryCard,
  SummaryCardBuildFragment,
  SummaryCardRepositoryFragment,
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
import {
  BuildStatusInfo,
  BuildStatusInfoBuildFragment,
  BuildStatusInfoRepositoryFragment,
  BuildStatusInfoScreenshotDiffResultFragment,
} from "./BuildStatusInfo";

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
      ...BuildStatusInfoRepositoryFragment
      ...ReviewButtonRepositoryFragment
      ...SummaryCardRepositoryFragment

      owner {
        id
        ...ReviewButtonOwnerFragment
        name
        login
        consumptionRatio
        plan {
          id
          name
        }
      }

      build(number: $buildNumber) {
        id
        ...SummaryCardBuildFragment
        ...ReviewButtonBuildFragment
        ...BuildStatusBadgeFragment
        ...BuildStatusInfoBuildFragment

        screenshotDiffs(
          where: { passing: false }
          offset: $offset
          limit: $limit
        ) {
          pageInfo {
            totalCount
          }
          ...ScreenshotDiffsPageFragment
          ...BuildStatusInfoScreenshotDiffResultFragment
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

  ${ReviewButtonRepositoryFragment}
  ${SummaryCardBuildFragment}
  ${SummaryCardRepositoryFragment}
  ${ScreenshotDiffsPageFragment}
  ${ReviewButtonBuildFragment}
  ${ReviewButtonOwnerFragment}
  ${BuildStatusBadgeFragment}
  ${BuildStatusInfoRepositoryFragment}
  ${BuildStatusInfoBuildFragment}
  ${BuildStatusInfoScreenshotDiffResultFragment}
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

function OvercapacityBanner({ owner: { plan, consumptionRatio, login } }) {
  if (!plan || !consumptionRatio || consumptionRatio < 0.9) {
    return null;
  }

  return (
    <Alert
      severity={consumptionRatio >= 1 ? "danger" : "warning"}
      mt={-3}
      mb={3}
      w="fit-content"
      mx="auto"
    >
      You've hit {Math.floor(consumptionRatio * 100)}% of the {plan.name} plan
      limit. <Link to={`/${login}/settings`}>Upgrade plan</Link>
    </Alert>
  );
}

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
  const [showStableScreenshots, setShowStableScreenshots] =
    React.useState(false);
  const { observe, inView, scrollDirection } = useInView({});

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
    owner,
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
      <OvercapacityBanner owner={owner} />

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

      {!inView && scrollDirection.vertical === "up" ? (
        <StickySummaryMenu
          repository={data.repository}
          build={build}
          screenshotDiffsCount={pageInfo.totalCount}
        />
      ) : null}

      {inProgress ? (
        <LoadingAlert my={5} flexDirection="column">
          {getBuildStatusLabel({ build })}
        </LoadingAlert>
      ) : (
        <>
          <BuildStatusInfo
            build={build}
            referenceBranch={data.repository.referenceBranch}
            screenshotCount={stats.screenshotCount}
          />

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
                alignSelf="start"
              >
                <IllustratedText
                  icon={showStableScreenshots ? EyeClosedIcon : EyeIcon}
                  field
                >
                  {showStableScreenshots ? "Hide" : "Show"} stable screenshots
                </IllustratedText>
              </Button>
            ) : null}
            <ReviewButton repository={data.repository} />
          </x.div>

          {showStableScreenshots ? (
            <StableScreenshots
              ownerLogin={ownerLogin}
              repositoryName={repositoryName}
              buildNumber={buildNumber}
            />
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
