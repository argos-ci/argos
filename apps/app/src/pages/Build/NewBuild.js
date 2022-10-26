/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import {
  Button,
  LoadingAlert,
  Link,
  Icon,
  Banner,
  BrandShield,
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
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useLiveRef } from "../../utils/useLiveRef";
import { BuildSidebar } from "./BuildSidebar";
import { BuildDiff } from "./BuildDiff";

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

const BuildHeader = ({ ownerLogin, repositoryName, buildNumber, build }) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    borderBottom={1}
    borderColor="layout-border"
    p={4}
    flex="0 0 auto"
  >
    <x.div display="flex" alignItems="center" gap={4}>
      <LinkBlock to={`/${ownerLogin}/${repositoryName}`}>
        <x.svg as={BrandShield} w={10} h={7} minW={10} />
      </LinkBlock>
      <div>
        <x.div fontWeight="medium" fontSize="xs" lineHeight={1} mb={1}>
          Build {buildNumber}
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
    </x.div>
    <x.div display="flex" alignItems="center">
      <Button>Review changes</Button>
    </x.div>
  </x.div>
);

const BuildContent = ({
  ownerLogin,
  repositoryName,
  buildNumber,
  activeDiffId,
}) => {
  const [showChanges, setShowChanges] = React.useState(true);
  const [moreLoading, setMoreLoading] = React.useState(false);

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

  const {
    owner: { plan, consumptionRatio },
    build,
  } = data.repository;
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

      <BuildHeader
        ownerLogin={ownerLogin}
        repositoryName={repositoryName}
        buildNumber={buildNumber}
        build={build}
      />

      <x.div
        display="flex"
        divideX={1}
        divideColor="layout-border"
        flex="1 1 auto"
      >
        <BuildSidebar
          moreLoading={moreLoading}
          fetchNextPage={fetchNextPage}
          ownerLogin={ownerLogin}
          repositoryName={repositoryName}
          build={build}
          w={296}
          minW={296}
        />

        <BuildDiff
          build={build}
          activeDiffId={activeDiffId}
          showChanges={showChanges}
          setShowChanges={setShowChanges}
        />
      </x.div>
    </x.div>
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
