/* eslint-disable react/no-unescaped-entities */
import styled, { x } from "@xstyled/styled-components";
import { Tab, TabList, TabPanel, useTabState } from "ariakit/tab";
import { useRef } from "react";

import { Link, ThumbnailsList, Time } from "@argos-ci/app/src/components";

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

    &:focus-visible {
      text-decoration: underline;
    }
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

const Sidebar = styled.box`
  [data-header-chevron] {
    opacity: 0;
  }

  &:hover {
    [data-header-chevron] {
      opacity: 1;
    }
  }

  &:focus-within {
    [data-header-chevron] {
      opacity: 1;
    }
  }
`;

const CommitLink = ({ githubRepoUrl, screenshotBucket }) => {
  if (!screenshotBucket) return "-";

  return (
    <Link href={`${githubRepoUrl}/commit/${screenshotBucket.commit}`}>
      {screenshotBucket.commit.split("").slice(0, 7)}
    </Link>
  );
};

export function BuildSidebar({
  moreLoading,
  fetchNextPage,
  build,
  activeDiff,
  previousRank,
  nextRank,
  buildUrl,
  githubRepoUrl,
  ...props
}) {
  const tab = useTabState();
  const sidebarTabsRef = useRef();

  const {
    stats,
    compareScreenshotBucket,
    baseScreenshotBucket,
    screenshotDiffs: { edges: screenshotDiffs },
  } = build;
  const sidebarTabRect = sidebarTabsRef.current?.getBoundingClientRect();

  return (
    <Sidebar {...props}>
      <TabList state={tab} aria-label="sidebar">
        <x.div
          ref={sidebarTabsRef}
          display="flex"
          py="5px"
          px={3}
          gap={2}
          borderBottom={1}
          borderColor="layout-border"
        >
          <SidebarTab>Screenshots</SidebarTab>
          <SidebarTab>Info</SidebarTab>
        </x.div>
      </TabList>

      <TabPanel state={tab} tabIndex={-1}>
        <ThumbnailsList
          data={screenshotDiffs}
          isFetchingNextPage={moreLoading}
          fetchNextPage={fetchNextPage}
          stats={stats}
          height={`calc(100vh - 35px - ${
            sidebarTabRect?.top + sidebarTabRect?.height || 0
          }px)`}
          activeDiff={activeDiff}
          previousRank={previousRank}
          nextRank={nextRank}
          buildUrl={buildUrl}
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

          <BuildInfoTitle>Baseline commit</BuildInfoTitle>
          <BuildInfo>
            <CommitLink
              githubRepoUrl={githubRepoUrl}
              screenshotBucket={baseScreenshotBucket}
            />
          </BuildInfo>

          <BuildInfoTitle>Changes commit</BuildInfoTitle>
          <BuildInfo>
            <CommitLink
              githubRepoUrl={githubRepoUrl}
              screenshotBucket={compareScreenshotBucket}
            />
          </BuildInfo>
        </x.div>
      </TabPanel>
    </Sidebar>
  );
}
