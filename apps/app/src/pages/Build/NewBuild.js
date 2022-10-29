/* eslint-disable react/no-unescaped-entities */
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { useCallback, useState } from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import {
  Banner,
  BrandShield,
  Icon,
  Link,
  LinkBlock,
  LoadingAlert,
} from "@argos-ci/app/src/components";
import { GitHubLoginButton } from "@argos-ci/app/src/containers/GitHub";

import { useQuery } from "../../containers/Apollo";
import {
  BuildStatusChip,
  BuildStatusChipBuildFragment,
  BuildStatusChipRepositoryFragment,
} from "../../containers/BuildStatusChip";
import { useUser } from "../../containers/User";
import { useLiveRef } from "../../utils/useLiveRef";
import { NotFound } from "../NotFound";
import { BuildDiff } from "./BuildDiff";
import { BuildSidebar } from "./BuildSidebar";
import {
  ReviewButton,
  ReviewButtonBuildFragment,
  ReviewButtonOwnerFragment,
  ReviewButtonRepositoryFragment,
} from "./ReviewButton";
import {
  ScreenshotDiffsPageFragment,
  fetchMoreScreenshotDiffs,
} from "./ScreenshotDiffsSection";
import {
  SummaryCardBuildFragment,
  SummaryCardRepositoryFragment,
} from "./SummaryCard";

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

        screenshotDiffs(offset: $offset, limit: $limit) {
          pageInfo {
            totalCount
            hasNextPage
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

  ${ScreenshotDiffsPageFragment}

  ${SummaryCardBuildFragment}
  ${SummaryCardRepositoryFragment}

  ${ReviewButtonRepositoryFragment}
  ${ReviewButtonBuildFragment}
  ${ReviewButtonOwnerFragment}

  ${BuildStatusChipBuildFragment}
  ${BuildStatusChipRepositoryFragment}
`;

const OvercapacityBanner = ({ plan, consumptionRatio, ownerLogin }) => (
  <Banner color={consumptionRatio >= 1 ? "danger" : "warning"} flex="0 0 auto">
    <Icon as={ExclamationTriangleIcon} w={4} />
    You've hit {Math.floor(consumptionRatio * 100)}% of the {plan.name} plan
    limit. <Link to={`/${ownerLogin}/settings`}>Upgrade plan</Link>
  </Banner>
);

const BuildHeader = ({
  repository,
  ownerLogin,
  repositoryName,
  buildNumber,
  build,
}) => {
  const user = useUser();

  return (
    <x.div
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      borderBottom={1}
      borderColor="layout-border"
      minW={700}
      p={4}
      flex="0 0 auto"
    >
      <x.div display="flex" alignItems="center" gap={4}>
        <LinkBlock to="/">
          <x.svg as={BrandShield} w={10} h={7} minW={10} />
        </LinkBlock>
        <div>
          <x.div fontWeight="medium" fontSize="sm" lineHeight={1} mb={1}>
            Build #{buildNumber}
          </x.div>
          <Link
            to={`/${ownerLogin}/${repositoryName}`}
            whiteSpace="nowrap"
            fontWeight="normal"
            lineHeight={1}
            fontSize="xs"
            color="secondary-text"
            display="block"
          >
            {ownerLogin}/{repositoryName}
          </Link>
        </div>
        <BuildStatusChip
          build={build}
          referenceBranch={repository.referenceBranch}
        />
      </x.div>
      <x.div display="flex" alignItems="center" gap={2}>
        {user ? (
          <ReviewButton repository={repository} />
        ) : (
          <GitHubLoginButton />
        )}
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
  const [showChanges, setShowChanges] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);

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
  const fetchNextPage = useCallback(() => {
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
    <x.div
      minHeight="100%"
      display="flex"
      flexDirection="column"
      minW="fit-content"
    >
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
        repository={data.repository}
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
