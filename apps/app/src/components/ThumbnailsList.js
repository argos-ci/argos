import * as React from "react";
import { x } from "@xstyled/styled-components";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { Badge } from "./Badge";
import { Alert } from "./Alert";
import { ChevronRightIcon } from "@primer/octicons-react";
import { LinkBlock } from "./Link";

const ThumbnailImage = ({ image, ...props }) => {
  if (!image?.url) return null;
  return (
    <x.img
      src={image.url}
      borderRadius="thumbnail"
      objectFit="contain"
      {...props}
    />
  );
};

function groupByStatus(data) {
  const statusGroups = data.reduce(
    (res, item) => ({
      ...res,
      [item.status]: res[item.status] ? [...res[item.status], item] : [item],
    }),
    []
  );

  return Object.keys(statusGroups).map((key) => ({
    title: key,
    diffs: statusGroups[key],
    collapsed: false,
  }));
}

function mergeGroups(groups = [], groupCollapseStatuses = {}) {
  let nextGroupIndex = 0;

  return groups.map((group) => {
    const index = nextGroupIndex;
    const collapsed = groupCollapseStatuses[group.title];
    const diffs = collapsed ? [] : group.diffs;
    nextGroupIndex += diffs.length + 1;
    return { ...group, index, collapsed, diffs };
  });
}

function getRows(groups) {
  return groups.flatMap(({ diffs, collapsed, ...group }) => [
    { type: "listHeader", collapsed, ...group },
    ...diffs.map((diff) => ({ type: "listItem", diff })),
  ]);
}

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
    {...props}
  />
);

const StickyItem = ({ active, ...props }) => (
  <ListItem
    as={LinkBlock}
    zIndex={1}
    {...(active ? { position: "sticky", transform: "none" } : {})}
    backgroundColor="bg"
    borderTop={1}
    borderBottom={1}
    borderColor="layout-border"
    pr={4}
    py={2}
    justifyContent="space-between"
    fontSize="md"
    lineHeight={1}
    textTransform="capitalize"
    cursor="default"
    borderRadius="0"
    {...props}
  />
);

export function ThumbnailsList({
  imageHeight = 200,
  gap = 20,
  headerSize = 32,
  data,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  stats,
}) {
  const parentRef = React.useRef();
  const activeStickyIndexRef = React.useRef(0);

  const groups = groupByStatus(data);

  const [groupCollapseStatuses, setGroupCollapseStatuses] = React.useState(
    groups.reduce((acc, group) => ({ ...acc, [group.title]: false }), {})
  );

  const mergedGroups = mergeGroups(groups, groupCollapseStatuses);
  const rows = getRows(mergedGroups);
  const stickyIndexes = mergedGroups.map(({ index }) => index);

  const isSticky = (index) => stickyIndexes.includes(index);
  const isActiveSticky = (index) => activeStickyIndexRef.current === index;

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? rows.length + 1 : rows.length,
    estimateSize: (i) => (isSticky(i) ? headerSize : imageHeight + gap),
    getScrollElement: () => parentRef.current,
    overscan: 5,
    rangeExtractor: React.useCallback(
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
    lastItem.index === rows.length - 1;

  React.useEffect(() => {
    if (shouldFetch) {
      fetchNextPage();
    }
  }, [shouldFetch, fetchNextPage]);

  return (
    <x.div ref={parentRef} h="calc(100vh - 154px)" w={1} overflowY="auto">
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
              const count = stats[`${item.title}ScreenshotCount`];

              return (
                <StickyItem
                  key={virtualRow.index}
                  virtualRow={virtualRow}
                  active={isActiveSticky(virtualRow.index)}
                  onClick={() => {
                    setGroupCollapseStatuses((prev) => ({
                      ...prev,
                      [item.title]: !prev[item.title],
                    }));
                  }}
                >
                  <x.div display="flex" alignItems="center">
                    <x.svg
                      as={ChevronRightIcon}
                      transform
                      rotate={item.collapsed ? 0 : 90}
                      transitionDuration={300}
                      w={4}
                      h={4}
                    />
                    {item.title}
                  </x.div>
                  {count ? <Badge variant="secondary">{count}</Badge> : null}
                </StickyItem>
              );
            }

            return (
              <ListItem key={virtualRow.index} virtualRow={virtualRow}>
                <x.div position="relative" display="inline-block">
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
                      item.diff.compareScreenshot || item.diff.baseScreenshot
                    }
                    h={imageHeight}
                  />
                </x.div>
              </ListItem>
            );
          })}
        </x.div>
      )}
    </x.div>
  );
}
