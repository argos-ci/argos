import { ChevronRightIcon } from "@primer/octicons-react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { x } from "@xstyled/styled-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { BuildStatLink, BuildStatLinks } from "./BuildStat";
import { LinkBlock } from "./Link";
import { Thumbnail, ThumbnailImage, ThumbnailTitle } from "./Thumbnail";

const DIFFS_GROUPS = {
  failed: { diffs: [], label: "failures", collapsed: false },
  updated: { diffs: [], label: "changes", collapsed: false },
  added: { diffs: [], label: "additions", collapsed: false },
  removed: { diffs: [], label: "deletions", collapsed: false },
  stable: { diffs: [], label: "stables", collapsed: true },
};

const ScreenshotName = ({ diff }) =>
  (diff?.compareScreenshot?.name || diff?.baseScreenshot?.name || "")
    .split(".")
    .slice(0, -1)
    .join(".");

const ListItem = ({ virtualRow, ...props }) => (
  <x.div
    top={0}
    left={0}
    w={1}
    virtualRow={virtualRow}
    h={`${virtualRow.size}px`}
    position="absolute"
    transform={`translateY(${virtualRow.start}px)`}
    px={5}
    display="flex"
    flexDirection="column"
    gap={2}
    {...props}
  />
);

const HeaderChevron = (props) => (
  <x.div
    w={4}
    display="inline-flex"
    alignItems="center"
    justifyContent="center"
    color="secondary-text"
    transform
    data-header-chevron=""
    {...props}
  >
    <x.svg as={ChevronRightIcon} w={3} h={3} />
  </x.div>
);

const Header = ({ ...props }) => (
  <x.div
    w={1}
    as={LinkBlock}
    display="flex"
    alignItems="center"
    justifyContent="space-between"
    fontSize="xs"
    lineHeight="16px"
    textTransform="capitalize"
    cursor="default"
    borderTop={1}
    borderBottom={1}
    borderColor="layout-border"
    borderRadius={0}
    backgroundColor="bg"
    userSelect="none"
    pr={4}
    h={1}
    {...props}
  />
);

const StickyItem = ({ active, ...props }) => (
  <ListItem
    zIndex={1}
    p={0}
    {...(active ? { position: "sticky", transform: "none" } : {})}
    {...props}
  />
);

function fillGroups(groups, data) {
  return data.reduce((res, item) => {
    res[item.status].diffs.push(item);
    return res;
  }, groups);
}

function enrichGroups(groups, groupCollapseStatuses, stats) {
  let nextGroupIndex = 0;

  const richGroups = Object.keys(groups).reduce((acc, status) => {
    const count = stats[`${status}ScreenshotCount`];
    if (count === 0) {
      return acc;
    }

    const index = nextGroupIndex;
    const collapsed = groupCollapseStatuses[status];
    nextGroupIndex += collapsed ? 1 : count + 1;

    return {
      ...acc,
      [status]: {
        ...groups[status],
        count,
        index,
        status,
        collapsed,
      },
    };
  }, {});

  return Object.values(richGroups);
}

function getRows(groups) {
  return groups.flatMap((group) => {
    return [
      { type: "listHeader", ...group },

      ...(group.collapsed
        ? []
        : Array.from({ length: group.count }, (e, i) => ({
            type: "listItem",
            diff: group.diffs[i] || null,
          }))),
    ];
  });
}

const DiffImages = ({ diff, imageHeight }) => (
  <>
    {diff.status === "updated" && (
      <ThumbnailImage
        image={diff}
        position="absolute"
        backgroundColor="rgba(255, 255, 255, 0.8)"
        top="50%"
        transform
        translateY="-50%"
      />
    )}
    <ThumbnailImage
      image={diff.compareScreenshot || diff.baseScreenshot}
      h={imageHeight}
    />
  </>
);

export function ThumbnailsList({
  imageHeight = 300,
  gap = 16,
  headerSize = 36,
  height = 400,
  data,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  stats,
}) {
  const { ownerLogin, repositoryName, buildNumber, diffId } = useParams();
  const parentRef = useRef();
  const activeStickyIndexRef = useRef(0);

  const filledGroups = fillGroups(DIFFS_GROUPS, data);

  const [groupCollapseStatuses, setGroupCollapseStatuses] = useState(
    Object.keys(DIFFS_GROUPS).reduce(
      (acc, status) => ({ ...acc, [status]: filledGroups[status].collapsed }),
      {}
    )
  );

  const richGroups = enrichGroups(filledGroups, groupCollapseStatuses, stats);
  const stickyIndexes = richGroups.map(({ index }) => index);
  const rows = getRows(richGroups);

  const isSticky = (index) => stickyIndexes.includes(index);
  const isActiveSticky = (index) => activeStickyIndexRef.current === index;
  const isFirst = (index) => isSticky(index - 1);
  const isLast = (index) => isSticky(index + 1);
  const handleStatClick = (status) => {
    const index = richGroups.find((group) => group.status === status).index;
    if (groupCollapseStatuses[status]) {
      setGroupCollapseStatuses((prev) => ({ ...prev, [status]: false }));
    }
    rowVirtualizer.scrollToIndex(index, { align: "start", smoothScroll: true });
  };

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? rows.length + 1 : rows.length,
    estimateSize: (i) =>
      isSticky(i)
        ? headerSize
        : gap + // top padding + bottom padding
          40 + // thumbnail title + gap
          imageHeight +
          (isFirst(i) ? gap / 2 : 0) +
          (isLast(i) ? gap / 2 : 0),
    getScrollElement: () => parentRef.current,
    overscan: 20,
    paddingEnd: 32,
    rangeExtractor: useCallback(
      (range) => {
        activeStickyIndexRef.current = Array.from(stickyIndexes)
          .reverse()
          .find((index) => range.startIndex >= index);

        const next = new Set([
          activeStickyIndexRef.current,
          ...defaultRangeExtractor(range),
        ]);

        return Array.from(next).sort((a, b) => a - b);
      },
      [stickyIndexes]
    ),
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  const shouldFetch =
    hasNextPage &&
    !isFetchingNextPage &&
    lastItem &&
    lastItem.index >= rows.length - 1;

  useEffect(() => {
    if (shouldFetch) {
      fetchNextPage();
    }
  }, [shouldFetch, fetchNextPage]);

  return (
    <>
      <BuildStatLinks>
        <BuildStatLink
          status="failed"
          count={stats.failedScreenshotCount}
          label="Failure screenshots"
          onClick={handleStatClick}
        />
        <BuildStatLink
          status="updated"
          count={stats.updatedScreenshotCount}
          label="Change screenshots"
          onClick={handleStatClick}
        />
        <BuildStatLink
          status="added"
          count={stats.addedScreenshotCount}
          label="Additional screenshots"
          onClick={handleStatClick}
        />
        <BuildStatLink
          status="removed"
          count={stats.removedScreenshotCount}
          label="Deleted screenshots"
          onClick={handleStatClick}
        />
        <BuildStatLink
          status="stable"
          count={stats.stableScreenshotCount}
          label="Stable screenshots"
          onClick={handleStatClick}
        />
      </BuildStatLinks>

      <x.div ref={parentRef} h={height} w={1} overflowY="auto">
        {rows.length === 0 ? (
          <Alert m={4} color="info">
            Empty build: no screenshot detected
          </Alert>
        ) : (
          <x.div w={1} position="relative" h={rowVirtualizer.getTotalSize()}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = rows[virtualRow.index];

              if (!item) return null;

              if (item.type === "listHeader") {
                return (
                  <StickyItem
                    key={virtualRow.index}
                    virtualRow={virtualRow}
                    active={isActiveSticky(virtualRow.index)}
                    onClick={() => {
                      setGroupCollapseStatuses((prev) => ({
                        ...prev,
                        [item.status]: !prev[item.status],
                      }));
                    }}
                  >
                    <Header
                      borderTopColor={
                        virtualRow.index === 0 ||
                        isFirst(virtualRow.index) ||
                        isActiveSticky(virtualRow.index)
                          ? "transparent"
                          : "layout-border"
                      }
                    >
                      <x.div
                        display="flex"
                        alignItems="center"
                        fontWeight="medium"
                      >
                        <HeaderChevron rotate={item.collapsed ? 0 : 90} />
                        {item.label}
                      </x.div>

                      <Badge variant="secondary">{item.count}</Badge>
                    </Header>
                  </StickyItem>
                );
              }

              return (
                <ListItem
                  key={virtualRow.index}
                  virtualRow={virtualRow}
                  pt={isFirst(virtualRow.index) ? `${gap}px` : `${gap / 2}px`}
                  pb={isLast(virtualRow.index) ? `${gap}px` : `${gap / 2}px`}
                >
                  <ThumbnailTitle>
                    <ScreenshotName diff={item.diff} />
                  </ThumbnailTitle>

                  {item.diff ? (
                    <Thumbnail
                      replace
                      to={`/${ownerLogin}/${repositoryName}/builds/${buildNumber}/new/${item.diff.id}`}
                      data-active={diffId === item.diff.id}
                    >
                      <DiffImages diff={item.diff} imageHeight={imageHeight} />
                    </Thumbnail>
                  ) : null}
                </ListItem>
              );
            })}
          </x.div>
        )}
      </x.div>
    </>
  );
}
