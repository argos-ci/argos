import { ChevronRightIcon } from "@primer/octicons-react";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import styled, { x } from "@xstyled/styled-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getDiffStatusColor,
  getDiffStatusIcon,
} from "../containers/ScreenshotDiffStatus";
import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { BuildStat } from "./BuildStat";
import { BaseLink, LinkBlock } from "./Link";

const DIFFS_GROUPS = {
  failed: { diffs: [], label: "failures", collapsed: false },
  updated: { diffs: [], label: "changes", collapsed: false },
  added: { diffs: [], label: "additions", collapsed: false },
  removed: { diffs: [], label: "deletions", collapsed: false },
  stable: { diffs: [], label: "stables", collapsed: true },
};

const ThumbnailImage = ({ image, ...props }) => {
  if (!image?.url) return null;
  return <x.img src={image.url} objectFit="contain" {...props} />;
};

const Thumbnail = styled(BaseLink)`
  background-color: bg;
  position: relative;
  display: inline-flex;
  justify-content: center;
  border-radius: base;
  padding: 0;
  cursor: default;
  width: 100%;

  &:hover {
    outline: solid 4px;
    outline-color: slate-700;
  }

  &:focus {
    outline: solid 4px;
    outline-color: sky-900-a70;
  }

  &[data-active="true"] {
    outline: solid 4px;
    outline-color: sky-900;
  }
`;

const ListItem = ({ virtualRow, ...props }) => (
  <x.div
    top={0}
    left={0}
    w={1}
    virtualRow={virtualRow}
    h={`${virtualRow.size}px`}
    position="absolute"
    transform={`translateY(${virtualRow.start}px)`}
    display="flex"
    alignItems="center"
    justifyContent="center"
    px={5}
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

const List = styled.box`
  width: 100%;
  overflow-y: auto;

  [data-header-chevron] {
    opacity: 0;
  }

  &:hover {
    [data-header-chevron] {
      opacity: 1;
    }
  }
`;

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

function BuildStatLink({ status, count, label, onClick }) {
  if (count === 0) return null;

  return (
    <BuildStat
      icon={getDiffStatusIcon(status)}
      color={getDiffStatusColor(status)}
      count={count}
      label={label}
      onClick={() => onClick(status)}
    />
  );
}

export function ThumbnailsList({
  imageHeight = 350,
  gap = 20,
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
  const handleClick = (status) => {
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
        : imageHeight +
          gap +
          (isFirst(i) ? gap / 2 : 0) +
          (isLast(i) ? gap / 2 : 0),
    getScrollElement: () => parentRef.current,
    overscan: 40,
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
      <x.div
        display="flex"
        px={4}
        py={2}
        borderBottom={1}
        borderColor="layout-border"
        justifyContent="flex-start"
        fontSize="sm"
        h="38px"
        ml="-10px"
      >
        <BuildStatLink
          status="failed"
          count={stats.failedScreenshotCount}
          label="Failure screenshots"
          onClick={handleClick}
        />
        <BuildStatLink
          status="updated"
          count={stats.updatedScreenshotCount}
          label="Change screenshots"
          onClick={handleClick}
        />
        <BuildStatLink
          status="added"
          count={stats.addedScreenshotCount}
          label="Additional screenshots"
          onClick={handleClick}
        />
        <BuildStatLink
          status="removed"
          count={stats.removedScreenshotCount}
          label="Deleted screenshots"
          onClick={handleClick}
        />
        <BuildStatLink
          status="stable"
          count={stats.stableScreenshotCount}
          label="Stable screenshots"
          onClick={handleClick}
        />
      </x.div>

      <List ref={parentRef} h={height}>
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
                        <HeaderChevron
                          transform
                          rotate={item.collapsed ? 0 : 90}
                        />
                        {item.label}
                      </x.div>

                      <Badge variant="secondary">{item.count}</Badge>
                    </Header>
                  </StickyItem>
                );
              }

              return (
                <ListItem key={virtualRow.index} virtualRow={virtualRow}>
                  {item.diff ? (
                    <Thumbnail
                      replace
                      to={`/${ownerLogin}/${repositoryName}/builds/${buildNumber}/new/${item.diff.id}`}
                      data-active={diffId === item.diff.id}
                      mt={isFirst(virtualRow.index) ? "10px" : 0}
                      mb={isLast(virtualRow.index) ? "10px" : 0}
                    >
                      {item.diff.status === "updated" && (
                        <ThumbnailImage
                          image={item.diff}
                          h={imageHeight}
                          position="absolute"
                          backgroundColor="rgba(255, 255, 255, 0.8)"
                        />
                      )}
                      <ThumbnailImage
                        image={
                          item.diff.compareScreenshot ||
                          item.diff.baseScreenshot
                        }
                        h={imageHeight}
                      />
                    </Thumbnail>
                  ) : null}
                </ListItem>
              );
            })}
          </x.div>
        )}
      </List>
    </>
  );
}
