/* eslint-disable react/no-unescaped-entities */
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { useCallback, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate, useParams } from "react-router-dom";

import {
  Banner,
  BrandShield,
  HotkeysDialog,
  Icon,
  Link,
  LinkBlock,
  LoadingAlert,
  Tooltip,
  TooltipAnchor,
  useDialogState,
  useTooltipState,
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
import { NotFoundWithContainer } from "../NotFound";
import { BuildDiff } from "./BuildDiff";
import { BuildSidebar } from "./BuildSidebar";
import { HOTKEYS } from "./Hotkeys";
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
    $limit: Int!
    $rank: Int!
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

        screenshotDiffs: screenshotDiffCursorPaginated(
          limit: $limit
          rank: $rank
        ) {
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
          commit
        }

        compareScreenshotBucket {
          id
          createdAt
          branch
          commit
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

const BrandLink = () => {
  const tooltip = useTooltipState();
  return (
    <>
      <TooltipAnchor state={tooltip}>
        <LinkBlock to="/">
          <x.svg as={BrandShield} w={10} h={7} minW={10} />
        </LinkBlock>
      </TooltipAnchor>
      <Tooltip state={tooltip}>Home</Tooltip>
    </>
  );
};

const RepositoryLink = ({ repoUrl, ownerLogin, repositoryName }) => {
  const tooltip = useTooltipState();
  return (
    <>
      <TooltipAnchor state={tooltip}>
        <Link
          to={repoUrl}
          whiteSpace="nowrap"
          fontWeight="normal"
          lineHeight={1}
          fontSize="xs"
          color="secondary-text"
          display="block"
        >
          {ownerLogin}/{repositoryName}
        </Link>
      </TooltipAnchor>
      <Tooltip state={tooltip}>See all builds</Tooltip>
    </>
  );
};

const BuildHeader = ({
  repository,
  buildNumber,
  build,
  repoUrl,
  ownerLogin,
  repositoryName,
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
        <BrandLink />
        <x.div
          display="flex"
          justifyContent="center"
          alignItems="flex-start"
          flexDirection="column"
          gap={1}
        >
          <x.div fontWeight="medium" fontSize="sm" lineHeight={1}>
            Build #{buildNumber}
          </x.div>
          <RepositoryLink
            repoUrl={repoUrl}
            ownerLogin={ownerLogin}
            repositoryName={repositoryName}
          />
        </x.div>
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
  activeRank,
}) => {
  const repoUrl = `/${ownerLogin}/${repositoryName}`;
  const buildUrl = `${repoUrl}/builds/${buildNumber}/new`;

  const navigate = useNavigate();
  const hotkeysDialog = useDialogState();
  const previousRank = useRef();
  const nextRank = useRef();
  const [moreLoading, setMoreLoading] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [containedScreenshots, setContainedScreenshots] = useState(true);

  const { loading, data, fetchMore } = useQuery(BUILD_QUERY, {
    variables: {
      ownerLogin,
      repositoryName,
      buildNumber,
      rank: 1,
      limit: 20,
    },
    skip: !ownerLogin || !repositoryName || !buildNumber,
  });

  const dataRef = useLiveRef(data);
  const fetchNextPage = useCallback(
    (rank) => {
      setMoreLoading(true);
      fetchMoreScreenshotDiffs({
        data: dataRef.current,
        fetchMore,
        rank,
      }).finally(() => {
        setMoreLoading(false);
      });
    },
    [fetchMore, dataRef]
  );

  useHotkeys(HOTKEYS.toggleContainedScreenshots.shortcut, () =>
    setContainedScreenshots((prev) => !prev)
  );
  useHotkeys(HOTKEYS.toggleHotkeysDialog.shortcut, hotkeysDialog.toggle);
  useHotkeys(HOTKEYS.toggleChangesOverlay.shortcut, () =>
    setShowChanges((prev) => !prev)
  );
  useHotkeys(HOTKEYS.previousDiff.shortcut, (e) => {
    e.preventDefault();
    if (previousRank.current) {
      navigate(`${buildUrl}/${previousRank.current}`, { replace: true });
    }
  });
  useHotkeys(HOTKEYS.nextDiff.shortcut, (e) => {
    e.preventDefault();
    if (nextRank.current) {
      navigate(`${buildUrl}/${nextRank.current}`, { replace: true });
    }
  });

  if (!data || loading) return <LoadingAlert mt={10} />;
  if (!data.repository?.build) return <NotFoundWithContainer mt={10} />;

  const {
    owner: { plan, consumptionRatio },
    build,
    build: {
      screenshotDiffs: { edges: screenshotDiffs },
    },
  } = data.repository;
  const showBanner = plan && consumptionRatio && consumptionRatio >= 0.9;
  const activeDiff =
    screenshotDiffs.find(({ rank }) => rank === activeRank) ||
    screenshotDiffs[0];

  return (
    <x.div
      minHeight="100%"
      display="flex"
      flexDirection="column"
      minW="fit-content"
    >
      <HotkeysDialog state={hotkeysDialog} hotkeys={HOTKEYS} />

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
        repoUrl={repoUrl}
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
          previousRank={previousRank}
          nextRank={nextRank}
          activeDiff={activeDiff}
          build={build}
          githubRepoUrl={`https://github.com/${ownerLogin}/${repositoryName}`}
          buildUrl={buildUrl}
          w={296}
          minW={296}
        />

        <BuildDiff
          baseScreenshotBucket={build.baseScreenshotBucket}
          compareScreenshotBucket={build.compareScreenshotBucket}
          activeDiff={activeDiff}
          showChanges={showChanges}
          setShowChanges={setShowChanges}
          previousRank={previousRank}
          nextRank={nextRank}
          buildUrl={buildUrl}
          containedScreenshots={containedScreenshots}
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
    diffRank: strActiveRank,
  } = useParams();

  const buildNumber = parseInt(strBuildNumber, 10);
  const activeRankNumber = parseInt(strActiveRank, 10) || 1;

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
          activeRank={activeRankNumber}
        />
      ) : (
        <NotFoundWithContainer mt={10} />
      )}
    </>
  );
}
