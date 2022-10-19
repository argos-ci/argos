import * as React from "react";
import { x } from "@xstyled/styled-components";
import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";

const ListItem = (props) => (
  <x.div
    position="absolute"
    top={0}
    left={0}
    w={183}
    transform
    display="flex"
    alignItems="center"
    justifyContent="center"
    {...props}
  />
);

const StickyListItem = ({ active, ...props }) => (
  <ListItem
    borderTop={1}
    borderBottom={1}
    borderColor="layout-border"
    zIndex={1}
    px={4}
    py={2}
    display="flex"
    justifyContent="space-between"
    fontSize="md"
    h={8}
    lineHeight={1}
    backgroundColor="bg"
    w={1}
    {...(active ? { position: "sticky", transform: false } : {})}
    {...props}
  />
);

function addHeaders({ data, groupField = "group" }) {
  const headers = [];

  const headedData = data.reduce((res, item, index) => {
    const itemGroup = item[groupField];

    if (itemGroup !== headers[headers.length - 1]?.listLabel) {
      const header = {
        type: "listHeader",
        listLabel: itemGroup,
        index: index + headers.length,
      };
      headers.push(header);
      return [...res, header, item];
    }
    return [...res, item];
  }, []);

  return { headers, headedData };
}

function isActiveSticky(activeStickyIndexRef, index) {
  return activeStickyIndexRef.current === index;
}

function Screenshot({ image, ...props }) {
  if (!image?.url) return null;
  return <x.img alt={image.name} src={image.url} {...props} />;
}

export function InfiniteListContent({ data, groupField, height, ...props }) {
  const parentRef = React.useRef();
  const activeStickyIndexRef = React.useRef(0);

  const { headers, headedData: rows } = addHeaders({ data, groupField });
  const stickyIndexes = headers.map(({ index }) => index);

  const gap = 20;
  const headerHeight = 8;
  const defaultItemHeight = 200;
  const addedOffset = gap * rows.length;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) =>
      stickyIndexes.includes(i) ? headerHeight : defaultItemHeight,
    paddingEnd: addedOffset + 40,
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

  if (!rows) return null;

  let displayedHeaderCount = 0;

  return (
    <x.div
      ref={parentRef}
      overflowY="auto"
      overflowX="hidden"
      h={height}
      {...props}
    >
      <x.div position="relative" h={virtualizer.getTotalSize()}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = rows[virtualRow.index];
          const translateY =
            virtualRow.start +
            displayedHeaderCount * 23 +
            virtualRow.index * gap;

          if (item.type === "listHeader") {
            displayedHeaderCount++;

            return (
              <StickyListItem
                key={virtualRow.index}
                virtualRow={virtualRow}
                active={isActiveSticky(activeStickyIndexRef, virtualRow.index)}
                translateY={translateY}
              >
                <div>{item.listLabel}</div>
                <div>{item.listLabel}</div>
              </StickyListItem>
            );
          }

          return (
            <ListItem
              key={virtualRow.index}
              h={virtualRow.size}
              translateY={translateY}
              border={1}
              borderRadius="md"
              borderColor="layout-border"
              ml={4}
            >
              <x.div position="relative" display="inline-block">
                {item.status === "updated" && item.url && (
                  <Screenshot
                    image={item}
                    position="absolute"
                    backgroundColor="rgba(255, 255, 255, 0.8)"
                    h={virtualRow.size}
                  />
                )}
                <Screenshot
                  image={item.compareScreenshot}
                  name={item.compareScreenshot?.name}
                  h={virtualRow.size}
                />
                {item.status !== "updated" && (
                  <Screenshot
                    image={item.baseScreenshot}
                    name={item.baseScreenshot?.name}
                    h={virtualRow.size}
                  />
                )}
              </x.div>
            </ListItem>
          );
        })}
      </x.div>
    </x.div>
  );
}

export function InfiniteList(props) {
  if (!props.data?.length || !props.height) return null;
  return <InfiniteListContent {...props} />;
}
