/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import styled, { x } from "@xstyled/styled-components";
import { Tab, TabList, TabPanel, useTabState } from "ariakit/tab";
import { Helmet } from "react-helmet";
import {
  Button,
  LoadingAlert,
  Link,
  Icon,
  Banner,
  IconButton,
  BrandShield,
  ThumbnailsList,
  InlineCode,
  BaseLink,
  Alert,
  Time,
  LinkBlock,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { NotFound } from "../NotFound";
import {
  ReviewButtonBuildFragment,
  ReviewButtonOwnerFragment,
  ReviewButtonRepositoryFragment,
} from "./ReviewButton";
import {
  SummaryCardBuildFragment,
  SummaryCardRepositoryFragment,
} from "./SummaryCard";
import {
  BuildStatusChip,
  BuildStatusChipFragment,
} from "../../containers/BuildStatusChip";
import {
  fetchMoreScreenshotDiffs,
  ScreenshotDiffsPageFragment,
} from "./ScreenshotDiffsSection";
import {
  BuildStatusInfoBuildFragment,
  BuildStatusInfoRepositoryFragment,
  BuildStatusInfoScreenshotDiffResultFragment,
} from "./BuildStatusInfo";
import { ArrowUpIcon, ArrowDownIcon, EyeIcon } from "@heroicons/react/24/solid";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useLiveRef } from "../../utils/useLiveRef";
import moment from "moment";

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
        ...BuildStatusChipFragment
        ...BuildStatusInfoBuildFragment

        screenshotDiffs(offset: $offset, limit: $limit) {
          pageInfo {
            totalCount
            hasNextPage
          }
          ...ScreenshotDiffsPageFragment
          ...BuildStatusInfoScreenshotDiffResultFragment
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

  ${ReviewButtonRepositoryFragment}
  ${SummaryCardBuildFragment}
  ${SummaryCardRepositoryFragment}
  ${ScreenshotDiffsPageFragment}
  ${ReviewButtonBuildFragment}
  ${ReviewButtonOwnerFragment}
  ${BuildStatusChipFragment}
  ${BuildStatusInfoRepositoryFragment}
  ${BuildStatusInfoBuildFragment}
  ${BuildStatusInfoScreenshotDiffResultFragment}
`;

const OvercapacityBanner = ({ plan, consumptionRatio, ownerLogin }) => (
  <Banner color={consumptionRatio >= 1 ? "danger" : "warning"} flex="0 0 auto">
    <Icon as={ExclamationTriangleIcon} w={4} />
    You've hit {Math.floor(consumptionRatio * 100)}% of the {plan.name} plan
    limit. <Link to={`/${ownerLogin}/settings`}>Upgrade plan</Link>
  </Banner>
);

const SidebarTab = styled(Tab)`
  background-color: transparent;
  color: secondary-text;
  padding: 1;
  font-size: xs;
  line-height: 16px;
  font-weight: medium;
  border-radius: lg;
  cursor: default;

  &:focus {
    outline: 0;
  }

  &:hover {
    color: secondary-text-hover;
  }

  &[aria-selected="true"] {
    color: primary-text;
  }

  $[data-focus-visible] {
    outline: 0;
    outline-offset: 2px;
  }
`;

const BuildInfoTitle = (props) => (
  <x.div
    fontSize="xs"
    lineHeight="16px"
    color="secondary-text"
    mb={1}
    {...props}
  />
);

const BuildInfo = (props) => (
  <x.div
    fontSize="sm"
    color="primary-text"
    fontWeight="medium"
    lineHeight="16px"
    mb={6}
    {...props}
  />
);

const BranchInfo = ({ bucket, baseline, ...props }) => {
  return (
    <x.div
      color="secondary-text"
      textAlign="center"
      w={1}
      fontWeight="medium"
      fontSize="xs"
      lineHeight={3}
      mb={4}
      {...props}
    >
      {bucket ? (
        <>
          {baseline ? "Baseline" : "Changes"} from{" "}
          <InlineCode mx={1}>{bucket.branch}</InlineCode>
          <x.div fontSize={11} mt={0.5} fontWeight="normal">
            {moment(bucket.createdAt).fromNow()}
          </x.div>
        </>
      ) : (
        "No baseline to compare"
      )}
    </x.div>
  );
};

const Sidebar = (props) => <x.div w={296} minW={296} {...props} />;

const Toolbar = (props) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    {...props}
  />
);

const ToolbarSection = (props) => (
  <x.div display="flex" alignItems="center" {...props} />
);

const BuildWithData = ({
  data,
  ownerLogin,
  buildNumber,
  repositoryName,
  activeDiffId,
  moreLoading,
  fetchNextPage,
}) => {
  const tab = useTabState();
  const [showChanges, setShowChanges] = React.useState(true);

  const {
    owner: { plan, consumptionRatio },
    build,
    build: {
      stats,
      baseScreenshotBucket,
      compareScreenshotBucket,
      screenshotDiffs: {
        pageInfo: { hasNextPage },
        edges: screenshotDiffs,
      },
    },
  } = data.repository;

  const activeDiff =
    screenshotDiffs.find(({ id }) => id === activeDiffId) || screenshotDiffs[0];
  const showBanner = plan && consumptionRatio && consumptionRatio >= 0.9;

  return (
    <x.div minHeight="100%" display="flex" flexDirection="column">
      {showBanner ? (
        <OvercapacityBanner
          plan={plan}
          consumptionRatio={consumptionRatio}
          ownerLogin={ownerLogin}
        />
      ) : null}

      <Toolbar
        borderBottom={1}
        borderColor="layout-border"
        p={4}
        flex="0 0 auto"
      >
        <ToolbarSection gap={4}>
          <LinkBlock to={`/${ownerLogin}/${repositoryName}`}>
            <x.svg as={BrandShield} w={10} h={7} minW={10} />
          </LinkBlock>
          <div>
            <x.div fontWeight="medium" fontSize="xs" lineHeight={1} mb={1}>
              Build #{buildNumber}
            </x.div>
            <x.div
              whiteSpace="nowrap"
              fontWeight="normal"
              lineHeight={1}
              fontSize={10}
              color="secondary-text"
            >
              {ownerLogin}/{repositoryName}
            </x.div>
          </div>
          <BuildStatusChip build={build} />
        </ToolbarSection>
        <ToolbarSection>
          <Button>Review changes</Button>
        </ToolbarSection>
      </Toolbar>

      <x.div
        display="flex"
        divideX={1}
        divideColor="layout-border"
        flex="1 1 auto"
      >
        <Sidebar>
          <TabList state={tab} aria-label="sidebar">
            <x.div
              display="flex"
              py="7px"
              px={3}
              gap={2}
              borderBottom={1}
              borderColor="layout-border"
            >
              <SidebarTab>Screenshots</SidebarTab>
              <SidebarTab>Info</SidebarTab>
            </x.div>
          </TabList>

          <TabPanel state={tab}>
            <ThumbnailsList
              data={screenshotDiffs}
              hasNextPage={hasNextPage}
              isFetchingNextPage={moreLoading}
              fetchNextPage={fetchNextPage}
              stats={stats}
              height={`calc(100vh - ${showBanner ? 48 + 65 + 36 : 65 + 36}px)`}
            />
          </TabPanel>
          <TabPanel state={tab}>
            <x.div display="flex" flexDirection="column" p={4}>
              <BuildInfoTitle>Created</BuildInfoTitle>
              <BuildInfo>
                <Time date={build.createdAt} format="LLL" />
              </BuildInfo>

              <BuildInfoTitle>Baseline build</BuildInfoTitle>
              <BuildInfo>Build {build.number}</BuildInfo>

              <BuildInfoTitle>Total screenshots count</BuildInfoTitle>
              <BuildInfo>{stats.screenshotCount}</BuildInfo>

              <BuildInfoTitle>Head commit</BuildInfoTitle>
              <BuildInfo>
                <Link
                  href={`https://github.com/${ownerLogin}/${repositoryName}/commit/${compareScreenshotBucket.commit}`}
                >
                  {compareScreenshotBucket.commit.split("").slice(0, 7)}
                </Link>
              </BuildInfo>

              <BuildInfoTitle>Base commit</BuildInfoTitle>
              <BuildInfo>
                <Link
                  href={`https://github.com/${ownerLogin}/${repositoryName}/commit/${compareScreenshotBucket.commit}`}
                >
                  {compareScreenshotBucket.commit.split("").slice(0, 7)}
                </Link>
              </BuildInfo>
            </x.div>
          </TabPanel>
        </Sidebar>

        <x.div p={4} flex="1 1 auto">
          <Toolbar mb={4}>
            <ToolbarSection>
              <IconButton icon={ArrowUpIcon} />
              <IconButton icon={ArrowDownIcon} />
              <x.div ml={3} fontSize="sm" fontWeight="medium" lineHeight={1.2}>
                {activeDiff.compareScreenshot?.name ||
                  activeDiff.baseScreenshot?.name}
              </x.div>
            </ToolbarSection>

            <ToolbarSection>
              <IconButton
                icon={EyeIcon}
                color="danger"
                onClick={() => setShowChanges((prev) => !prev)}
                toggle={showChanges}
              />
            </ToolbarSection>
          </Toolbar>

          <x.div display="flex" justifyContent="space-between" gap={6}>
            <x.div display="flex" flex={1} flexDirection="column">
              <BranchInfo bucket={baseScreenshotBucket} baseline />

              {activeDiff.baseScreenshot?.url ? (
                <BaseLink href={activeDiff.baseScreenshot.url} target="_blank">
                  <img
                    src={activeDiff.baseScreenshot.url}
                    alt={activeDiff.baseScreenshot.name}
                  />
                </BaseLink>
              ) : (
                <Alert color="info">
                  No compare baseline for {activeDiff.status} screenshot.
                </Alert>
              )}
            </x.div>

            <x.div display="flex" flex={1} flexDirection="column">
              <BranchInfo bucket={compareScreenshotBucket} />
              {activeDiff.compareScreenshot?.url &&
              activeDiff.status !== "stable" ? (
                <BaseLink
                  href={activeDiff.compareScreenshot?.url}
                  target="_blank"
                  position="relative"
                  display="inline-block" // fix Firefox bug on "position: relative"
                >
                  {showChanges && activeDiff.url ? (
                    <x.img
                      src={activeDiff.url}
                      position="absolute"
                      backgroundColor="rgba(255, 255, 255, 0.8)"
                    />
                  ) : null}

                  <x.img
                    alt={activeDiff.compareScreenshot.name}
                    src={activeDiff.compareScreenshot.url}
                  />
                </BaseLink>
              ) : (
                <Alert color="info">
                  No change for {activeDiff.status} screenshot.
                </Alert>
              )}
            </x.div>
          </x.div>
        </x.div>
      </x.div>
    </x.div>
  );
};

const BuildContent = ({
  ownerLogin,
  repositoryName,
  buildNumber,
  activeDiffId,
}) => {
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

  const dataRef = useLiveRef(data);
  const [moreLoading, setMoreLoading] = React.useState(false);
  const fetchNextPage = React.useCallback(() => {
    setMoreLoading(true);
    fetchMoreScreenshotDiffs({ data: dataRef.current, fetchMore }).finally(
      () => {
        setMoreLoading(false);
      }
    );
  }, [fetchMore, dataRef]);

  if (!data || loading) return <LoadingAlert />;
  if (!data.repository?.build) return <NotFound />;

  return (
    <BuildWithData
      data={data}
      ownerLogin={ownerLogin}
      buildNumber={buildNumber}
      repositoryName={repositoryName}
      moreLoading={moreLoading}
      activeDiffId={activeDiffId}
      fetchNextPage={fetchNextPage}
    />
  );
};

export function NewBuild() {
  const {
    ownerLogin,
    repositoryName,
    buildNumber: strBuildNumber,
    diffId: activeDiffId,
  } = useParams();

  const buildNumber = parseInt(strBuildNumber, 10);

  return (
    <>
      <Helmet>
        <title>{`Build #${buildNumber} - ${repositoryName}`}</title>
      </Helmet>
      {Number.isInteger(buildNumber) ? (
        <BuildContent
          ownerLogin={ownerLogin}
          repositoryName={repositoryName}
          buildNumber={buildNumber}
          activeDiffId={activeDiffId}
        />
      ) : (
        <NotFound />
      )}
    </>
  );
}
