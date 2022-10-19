import * as React from "react";
import { x } from "@xstyled/styled-components";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";
import { Badge } from "./Badge";
import { Alert } from "./Alert";

const DiffThumbnail = ({ diff, height }) => {
  return (
    <x.div position="relative" display="inline-block">
      {diff.status === "updated" && diff.url && (
        <x.img
          src={diff.url}
          position="absolute"
          backgroundColor="rgba(255, 255, 255, 0.8)"
          borderRadius="thumbnail"
          h={height}
        />
      )}

      {diff.compareScreenshot ? (
        <x.img
          src={diff.compareScreenshot.url}
          name={diff.compareScreenshot.name}
          borderRadius="thumbnail"
          h={height}
        />
      ) : diff.baseScreenshot ? (
        <x.img
          src={diff.baseScreenshot.url}
          name={diff.baseScreenshot.name}
          borderRadius="thumbnail"
          h={height}
        />
      ) : null}
    </x.div>
  );
};

function addHeaders({ data, groupField = "group" }) {
  const headers = [];

  const headedData = data.reduce((res, item, index) => {
    const currentGroup = item[groupField];

    if (currentGroup === headers[headers.length - 1]?.value) {
      return [
        ...res,
        { index: index + headers.length, type: "listItem", value: item },
      ];
    }

    headers.push({
      index: index + headers.length,
      type: "listHeader",
      value: currentGroup,
    });

    return [
      ...res,
      headers[headers.length - 1],
      { index: index + headers.length, type: "listItem", value: item },
    ];
  }, []);

  return { headers, headedData };
}

const NewListItem = ({ virtualRow, ...props }) => (
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

const NewStickyListItem = ({ active, ...props }) => (
  <NewListItem
    zIndex={1}
    {...(active ? { position: "sticky", transform: "none" } : {})}
    backgroundColor="bg"
    borderTop={1}
    borderBottom={1}
    borderColor="layout-border"
    px={4}
    py={2}
    justifyContent="space-between"
    fontSize="md"
    lineHeight={1}
    textTransform="capitalize"
    {...props}
  />
);

export function ThumbnailsList({
  imageHeight = 200,
  gap = 20,
  groupField = "status",
  headerSize = 32,
  data,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  stats,
}) {
  const itemEstimateSize = imageHeight + gap;

  const parentRef = React.useRef();
  const activeStickyIndexRef = React.useRef(0);

  const { headers, headedData: rows } = addHeaders({ data, groupField });

  const stickyIndexes = headers.map(({ index }) => index);

  const isSticky = (index) => stickyIndexes.includes(index);
  const isActiveSticky = (index) => activeStickyIndexRef.current === index;

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? rows.length + 1 : rows.length,
    estimateSize: (i) => (isSticky(i) ? headerSize : itemEstimateSize),
    getScrollElement: () => parentRef.current,
    overscan: 5,
    rangeExtractor: React.useCallback(
      (range) => {
        activeStickyIndexRef.current = [...stickyIndexes]
          .reverse()
          .find((index) => range.startIndex >= index);

        const next = new Set([
          activeStickyIndexRef.current,
          ...defaultRangeExtractor(range),
        ]);

        return [...next].sort((a, b) => a - b);
      },
      [stickyIndexes]
    ),
  });

  React.useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= rows.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    rows.length,
    isFetchingNextPage,
    rowVirtualizer,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    rowVirtualizer.getVirtualItems(),
  ]);

  return (
    <x.div ref={parentRef} h="calc(100vh - 154px)" w={1} overflowY="auto">
      {rows.length === 0 ? (
        <Alert m={4} color="info">
          Empty build: no screenshot detected
        </Alert>
      ) : (
        <x.div w={1} position="relative" h={rowVirtualizer.getTotalSize()}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index > rows.length - 1;
            const item = rows[virtualRow.index];

            if (isLoaderRow && hasNextPage) return "Loading more...";
            if (isLoaderRow) return "Nothing more to load";

            if (item.type === "listHeader") {
              const count = stats[`${item.value}ScreenshotCount`];

              return (
                <NewStickyListItem
                  key={virtualRow.index}
                  virtualRow={virtualRow}
                  active={isActiveSticky(virtualRow.index)}
                >
                  {item.value}
                  {count ? <Badge>{count}</Badge> : null}
                </NewStickyListItem>
              );
            }

            return (
              <NewListItem key={virtualRow.index} virtualRow={virtualRow}>
                <DiffThumbnail diff={item.value} height={imageHeight} />
              </NewListItem>
            );
          })}
        </x.div>
      )}
    </x.div>
  );
}
