/* eslint-disable react/no-unescaped-entities */
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { useInView } from "react-cool-inview";
import moment from "moment";
import {
  Button,
  Container,
  IllustratedText,
  LoadingAlert,
  PrimaryTitle,
  Alert,
  Link,
  Icon,
  InlineCode,
  BuildStat,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  ReviewButton,
  ReviewButtonBuildFragment,
  ReviewButtonOwnerFragment,
  ReviewButtonRepositoryFragment,
} from "./ReviewButton";
import {
  ArrowDownIcon,
  EyeClosedIcon,
  EyeIcon,
  ImageIcon,
} from "@primer/octicons-react";
import { getBuildStatusLabel } from "../../containers/BuildStatus";
import {
  StickySummaryMenu,
  SummaryCard,
  SummaryCardBuildFragment,
  SummaryCardRepositoryFragment,
} from "./SummaryCard";
import {
  BuildStatusChip,
  BuildStatusChipBuildFragment,
  BuildStatusChipRepositoryFragment,
} from "../../containers/BuildStatusChip";
import {
  fetchMoreScreenshotDiffs,
  LoadMoreButton,
  ScreenshotDiffsPageFragment,
  ScreenshotDiffsSection,
} from "./ScreenshotDiffsSection";
import { StableScreenshots } from "./StableScreenshotDiffs";
import {
  BuildStatusInfoAlert,
  BuildStatusInfoBuildFragment,
  BuildStatusInfoRepositoryFragment,
} from "./BuildStatusInfo";
import {
  getDiffStatusColor,
  getDiffStatusIcon,
} from "../../containers/ScreenshotDiffStatus";
import { useEffect, useState } from "react";

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
      ...BuildStatusChipRepositoryFragment

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
        ...BuildStatusChipBuildFragment
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
        }

        baseScreenshotBucket {
          id
          createdAt
          branch
        }

        compareScreenshotBucket {
          id
          createdAt
          branch
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

  ${SummaryCardBuildFragment}
  ${SummaryCardRepositoryFragment}

  ${ScreenshotDiffsPageFragment}

  ${ReviewButtonBuildFragment}
  ${ReviewButtonRepositoryFragment}
  ${ReviewButtonOwnerFragment}

  ${BuildStatusChipBuildFragment}
  ${BuildStatusChipRepositoryFragment}

  ${BuildStatusInfoBuildFragment}
  ${BuildStatusInfoRepositoryFragment}
`;

function OvercapacityBanner({ owner: { plan, consumptionRatio, login } }) {
  if (!plan || !consumptionRatio || consumptionRatio < 0.9) {
    return null;
  }

  return (
    <Alert
      color={consumptionRatio >= 1 ? "danger" : "warning"}
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

export function ShowChangesButton({ setShowChanges, showChanges }) {
  return (
    <Button
      color="secondary"
      onClick={() => setShowChanges((prev) => !prev)}
      alignSelf="center"
    >
      <x.div position="relative" mr={2}>
        <Icon as={ImageIcon} minW={4} />
        <Icon
          minW={4}
          as={ImageIcon}
          color="danger"
          left={0}
          ml="3px"
          mt="-1px"
          position="absolute"
          backgroundColor="gray-900-a80"
          borderRadius="15%"
          borderColor="black"
        />
      </x.div>
      {showChanges ? "Hide" : "Show"} changes
    </Button>
  );
}

const BuildContent = ({ ownerLogin, repositoryName, buildNumber }) => {
  const [showStableScreenshots, setShowStableScreenshots] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
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

  useEffect(() => {
    if (inProgress) {
      startPolling(1000);
    } else {
      stopPolling();
    }
  }, [stopPolling, startPolling, inProgress]);

  const [moreLoading, setMoreLoading] = useState();

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
          <BuildStatusChip
            build={build}
            referenceBranch={data.repository.referenceBranch}
          />
        </x.div>

        <x.div display="flex" alignItems="flex-start" pt="6px" flexShrink={0}>
          <BuildStat
            icon={getDiffStatusIcon("failed")}
            color={getDiffStatusColor("failed")}
            count={stats.failedScreenshotCount}
            label="Failure screenshots"
          />
          <BuildStat
            icon={getDiffStatusIcon("added")}
            color={getDiffStatusColor("added")}
            count={stats.addedScreenshotCount}
            label="Additional screenshots"
          />
          <BuildStat
            icon={getDiffStatusIcon("removed")}
            color={getDiffStatusColor("removed")}
            count={stats.removedScreenshotCount}
            label="Deleted screenshots"
          />
          <BuildStat
            icon={getDiffStatusIcon("updated")}
            color={getDiffStatusColor("updated")}
            count={stats.updatedScreenshotCount}
            label="Change screenshots"
          />
          <BuildStat
            icon={getDiffStatusIcon("stable")}
            color={getDiffStatusColor("stable")}
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
          showChanges={showChanges}
          setShowChanges={setShowChanges}
          updatedScreenshotCount={stats.updatedScreenshotCount}
        />
      ) : null}

      {inProgress ? (
        <LoadingAlert my={5} flexDirection="column">
          {getBuildStatusLabel({ build })}
        </LoadingAlert>
      ) : (
        <>
          <BuildStatusInfoAlert
            build={build}
            referenceBranch={data.repository.referenceBranch}
          />

          <x.div
            display="flex"
            justifyContent="space-between"
            gap={4}
            flexWrap="wrap-reverse"
            mt={5}
            ref={observe}
          >
            <x.div display="flex" flexWrap="wrap" gap={4}>
              {stats.stableScreenshotCount > 0 ? (
                <Button
                  color="secondary"
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
              {stats.updatedScreenshotCount > 0 ? (
                <ShowChangesButton
                  setShowChanges={setShowChanges}
                  showChanges={showChanges}
                />
              ) : null}
            </x.div>
            <x.div flex={1} display="flex" justifyContent="flex-end">
              <ReviewButton repository={data.repository} />
            </x.div>
          </x.div>

          {pageInfo.totalCount > 0 ? (
            <x.div display="flex" mt={10}>
              <x.div flex={1} textAlign="center">
                {build.baseScreenshotBucket ? (
                  <>
                    Baseline from{" "}
                    <InlineCode mx={1}>
                      {build.baseScreenshotBucket.branch}
                    </InlineCode>
                    <Icon as={ArrowDownIcon} />
                    <x.div color="secondary-text">
                      {moment(build.baseScreenshotBucket.createdAt).fromNow()}
                    </x.div>
                  </>
                ) : (
                  <>
                    No baseline to compare <Icon as={ArrowDownIcon} />
                  </>
                )}
              </x.div>
              <x.div flex={1} textAlign="center">
                Changes from{" "}
                <InlineCode mx={1}>
                  {build.compareScreenshotBucket.branch}
                </InlineCode>
                <Icon as={ArrowDownIcon} />
                <x.div color="secondary-text">
                  {moment(build.compareScreenshotBucket.createdAt).fromNow()}
                </x.div>
              </x.div>
            </x.div>
          ) : null}

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
            color="danger"
            showChanges={showChanges}
          />
          <ScreenshotDiffsSection
            title="Added Screenshots"
            screenshotDiffs={diffGroups.added}
            showChanges={showChanges}
          />
          <ScreenshotDiffsSection
            title="Removed Screenshots"
            screenshotDiffs={diffGroups.removed}
            opened={false}
            showChanges={showChanges}
          />
          <ScreenshotDiffsSection
            title="Updated Screenshots"
            screenshotDiffs={diffGroups.updated}
            showChanges={showChanges}
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
