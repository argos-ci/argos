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
  IconButton,
  BrandShield,
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
import { ThumbnailsList } from "../../components/ThumbnailsList";
import { useLiveRef } from "../../utils/useLiveRef";

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

        screenshotDiffs(
          where: { passing: false }
          offset: $offset
          limit: $limit
        ) {
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

  if (!data || loading) {
    return <LoadingAlert />;
  }

  if (!data.repository?.build) {
    return <NotFound />;
  }

  const {
    build,
    build: {
      stats,
      screenshotDiffs: {
        pageInfo: { hasNextPage },
        edges: screenshotDiffs,
      },
    },
  } = data.repository;

  return (
    <x.div minHeight="100%" display="flex" flexDirection="column">
      <Banner color="danger" flex="0 0 auto">
        <Icon as={ExclamationTriangleIcon} w={4} />
        You've hit 105% of the plan limit. <Link>Upgrade plan</Link>
      </Banner>

      <x.div
        display="flex"
        justifyContent="space-between"
        borderBottom={1}
        borderColor="layout-border"
        p={4}
        alignItems="center"
        flex="0 0 auto"
      >
        <x.div display="flex" alignItems="center" gap={4}>
          <BrandShield width={40} height={40} />
          Build 1234
          <BuildStatusChip build={build} />
        </x.div>
        <x.div>
          <Button>Review changes</Button>
        </x.div>
      </x.div>

      <x.div display="flex" divideX={1} divideColor="layout-border">
        <x.div w={296}>
          <x.div display="flex" gap={4} px={4} py={2} lineHeight={1}>
            <x.div>Screenshots</x.div>
            <x.div>Info</x.div>
          </x.div>

          <ThumbnailsList
            data={screenshotDiffs}
            hasNextPage={hasNextPage}
            isFetchingNextPage={moreLoading}
            fetchNextPage={fetchNextPage}
            stats={stats}
          />
        </x.div>

        <x.div p={4} w={1} flex="1 1 auto">
          <x.div display="flex" justifyContent="space-between">
            <x.div display="flex" alignItems="center">
              <IconButton icon={ArrowUpIcon} />
              <IconButton icon={ArrowDownIcon} />
              <x.div ml={2}>Login page</x.div>
            </x.div>

            <x.div>
              <IconButton icon={EyeIcon} color="danger" />
            </x.div>
          </x.div>
        </x.div>
      </x.div>
    </x.div>
  );
};

export function NewBuild() {
  const {
    ownerLogin,
    repositoryName,
    buildNumber: strBuildNumber,
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
        />
      ) : (
        <NotFound />
      )}
    </>
  );
}
