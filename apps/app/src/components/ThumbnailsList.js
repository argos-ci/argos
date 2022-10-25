import * as React from "react";
import styled, { x } from "@xstyled/styled-components";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { Badge } from "./Badge";
import { Alert } from "./Alert";
import { ChevronRightIcon } from "@primer/octicons-react";
import { BaseLink, LinkBlock } from "./Link";
import { useParams } from "react-router-dom";

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

const Thumbnail = styled(BaseLink)`
  background-color: bg;
  position: relative;
  display: inline-block;
  border-radius: thumbnail;
  padding: 0;
  cursor: default;

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

const Header = ({ previousIsHeader, ...props }) => (
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
    borderTopColor={previousIsHeader ? "transparent" : "layout-border"}
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
  let itemIndex = 0;

  return groups.flatMap(({ diffs, collapsed, ...group }, groupIndex) => [
    { type: "listHeader", collapsed, ...group, index: groupIndex },
    ...diffs.map((diff) => ({ type: "listItem", diff, index: itemIndex++ })),
  ]);
}

export function ThumbnailsList({
  imageHeight = 200,
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
  const isFirst = (index) => isSticky(index - 1);
  const isLast = (index) => isSticky(index + 1);

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
    overscan: 5,
    paddingEnd: 20,
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
    lastItem.index >= rows.length - 1;

  React.useEffect(() => {
    if (shouldFetch) {
      fetchNextPage();
    }
  }, [shouldFetch, fetchNextPage]);

  return (
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
                  <Header previousIsHeader={isFirst(virtualRow.index)}>
                    <x.div
                      display="flex"
                      alignItems="center"
                      fontWeight="medium"
                    >
                      <HeaderChevron
                        transform
                        rotate={item.collapsed ? 0 : 90}
                      />
                      {item.title}
                    </x.div>

                    {count ? <Badge variant="secondary">{count}</Badge> : null}
                  </Header>
                </StickyItem>
              );
            }

            return (
              <ListItem key={virtualRow.index} virtualRow={virtualRow}>
                <Thumbnail
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
                      item.diff.compareScreenshot || item.diff.baseScreenshot
                    }
                    h={imageHeight}
                  />
                </Thumbnail>
              </ListItem>
            );
          })}
        </x.div>
      )}
    </List>
  );
}
