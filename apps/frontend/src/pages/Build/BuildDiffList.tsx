import { ChevronDownIcon, CornerDownRightIcon } from "lucide-react";
import {
  Range,
  defaultRangeExtractor,
  useVirtualizer,
} from "@tanstack/react-virtual";
import { Button as AriakitButton } from "ariakit/button";
import { clsx } from "clsx";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/ui/Badge";

import { getGroupLabel } from "./BuildDiffGroup";
import {
  Diff,
  DiffGroup,
  DiffResult,
  useBuildDiffState,
  useSearchModeState,
  useSearchState,
} from "./BuildDiffState";
import { BuildStatsIndicator } from "./BuildStatsIndicator";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { useBuildHotkey } from "./BuildHotkeys";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";

interface ListHeaderRow {
  type: "header";
  name: DiffGroup["name"];
  count: number;
  expanded: boolean;
  borderBottom: boolean;
  group: DiffGroup;
}

interface ListItemRow {
  type: "item";
  first: boolean;
  last: boolean;
  diff: Diff | null;
  result: DiffResult | null;
}

interface ListGroupItemRow {
  type: "group-item";
  first: boolean;
  last: boolean;
  diff: Diff | null;
  result: DiffResult | null;
  expanded: boolean;
  group: Diff[];
}

type ListRow = ListHeaderRow | ListItemRow | ListGroupItemRow;

const createHeaderRow = ({
  group,
  expanded,
  borderBottom,
}: {
  group: DiffGroup;
  expanded: boolean;
  borderBottom: boolean;
}): ListHeaderRow => ({
  type: "header",
  name: group.name,
  count: group.diffs.length,
  expanded,
  borderBottom,
  group,
});

const createListItemRow = ({
  diff,
  first,
  last,
  result,
}: {
  diff: Diff | null;
  first: boolean;
  last: boolean;
  result: DiffResult | null;
}): ListItemRow => ({
  type: "item",
  diff,
  first,
  last,
  result,
});

const createGroupItemRow = ({
  diff,
  first,
  last,
  expanded,
  result,
}: {
  diff: Diff;
  first: boolean;
  last: boolean;
  expanded: boolean;
  result: DiffResult | null;
}): ListGroupItemRow => ({
  type: "group-item",
  diff,
  first,
  last,
  result,
  expanded,
  group: [diff],
});

const getRows = (
  groups: DiffGroup[],
  expandedGroups: string[],
  results: DiffResult[],
): ListRow[] => {
  return (
    groups
      // Filter out empty groups
      .filter((group) => group.diffs.length > 0)
      .flatMap((group, groupIndex, filteredGroups) => {
        const isLastGroup = groupIndex === filteredGroups.length - 1;
        const isGroupExpanded = expandedGroups.includes(group.name);

        // Create the header row
        const initialRows: ListRow[] = [
          createHeaderRow({
            group,
            expanded: isGroupExpanded,
            borderBottom: isLastGroup || isGroupExpanded,
          }),
        ];

        // If the group is not expanded, return the header row only
        if (!isGroupExpanded) return initialRows;

        return group.diffs.reduce((acc, diff, index, diffs) => {
          const first = index === 0;
          const last = index === diffs.length - 1;
          const result = results.find((r) => r.item === diff) ?? null;

          // If the diff is not part of a group, return a single item row
          if (!diff?.group || Boolean(result)) {
            return [...acc, createListItemRow({ diff, first, last, result })];
          }

          const previousGroupItem = acc.findLast(
            (row) => row.type === "group-item",
          ) as ListGroupItemRow | undefined;
          const isSameGroup =
            previousGroupItem && diff.group === previousGroupItem.diff?.group;
          const expanded = expandedGroups.includes(diff.group);

          // If the diff is part the last group
          if (isSameGroup) {
            // update the group count
            previousGroupItem.group.push(diff);

            // If the group is expanded, add an item row
            if (expanded) {
              return [...acc, createListItemRow({ diff, first, last, result })];
            }

            // If the diff is collapsed, update the last flag
            previousGroupItem.last = last;
            return acc;
          }

          // Otherwise, create a new group item row
          return [
            ...acc,
            createGroupItemRow({ diff, first, last, expanded, result }),
          ];
        }, initialRows as ListRow[]);
      })
  );
};

const ListHeader = ({
  style,
  onClick,
  item,
  activeIndex,
}: {
  style: React.HTMLProps<HTMLDivElement>["style"];
  onClick: React.HTMLProps<HTMLDivElement>["onClick"];
  item: ListHeaderRow;
  activeIndex: number;
}) => {
  const borderB = item.borderBottom ? "border-b border-b-border" : "";
  return (
    <AriakitButton
      as="div"
      className={clsx(
        borderB,
        "border-t-border z-10 flex cursor-default select-none items-center border-t bg-app pr-4 hover:bg-subtle",
      )}
      style={style}
      onClick={onClick}
    >
      <ChevronDownIcon
        className={clsx(
          "m-0.5 h-3 w-3 shrink-0 transform text-low opacity-0 transition group-hover/sidebar:opacity-100",
          !item.expanded && "-rotate-90",
        )}
      />
      <div className="flex-1 text-sm font-medium text">
        {getGroupLabel(item.name)}
      </div>
      <Badge className="shrink-0">
        {activeIndex !== -1 ? <>{activeIndex + 1} / </> : null}
        {item.count}
      </Badge>
    </AriakitButton>
  );
};

const getImgAttributes = (
  url: string,
  dimensions?: { width: number; height: number },
) => {
  const src = dimensions
    ? `${url}?contain-max=${dimensions.width * 2}x${dimensions.height * 2}`
    : url;
  return {
    key: src,
    src,
    width: dimensions?.width,
    height: dimensions?.height,
  };
};

const DiffImage = memo(({ diff }: { diff: Diff }) => {
  const dimensions = getDiffDimensions(diff);

  switch (diff.status) {
    case "added":
    case "unchanged":
    case "failure":
      return (
        <img
          {...getImgAttributes(diff.compareScreenshot!.url, dimensions)}
          className="max-h-full max-w-full object-contain"
        />
      );
    case "removed":
      return (
        <img
          {...getImgAttributes(diff.baseScreenshot!.url, dimensions)}
          className="max-h-full max-w-full object-contain"
        />
      );
    case "changed": {
      const dimensions = getDiffDimensions(diff);
      return (
        <div className="flex h-full items-center justify-center">
          <div
            className="relative"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <img
              {...getImgAttributes(diff.compareScreenshot!.url)}
              className="absolute w-full"
            />
            <div className="absolute inset-0 bg-black bg-opacity-70" />
            <img
              className="relative z-10 max-h-full w-full"
              {...getImgAttributes(diff.url!, dimensions)}
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
});

const CardStack = ({
  isFirst,
  isLast,
}: {
  isFirst: boolean;
  isLast: boolean;
}) => {
  return (
    <div
      className={clsx(
        "absolute -z-10 border block  border-border rounded-lg w-[262px] right-2 bg-hover",
        isFirst ? "top-6" : "top-4",
        isLast ? "bottom-2" : "bottom-0",
      )}
      tabIndex={-1}
    />
  );
};

const ShowSubItemToggle = (
  props: ButtonProps & {
    count: number;
    open: boolean;
    onToggleGroupItem: () => void;
  },
) => {
  const { open, onToggleGroupItem } = props;

  const expandDiff = useBuildHotkey(
    "expandDiffGroup",
    () => !open && onToggleGroupItem(),
    { preventDefault: true },
  );
  const collapseDiff = useBuildHotkey(
    "collapseDiffGroup",
    () => open && onToggleGroupItem(),
    { preventDefault: true },
  );

  if (props.count === 0) {
    return null;
  }

  return (
    <HotkeyTooltip
      description={open ? collapseDiff.description : expandDiff.description}
      keys={open ? collapseDiff.displayKeys : expandDiff.displayKeys}
    >
      <Button
        color="neutral"
        size="small"
        className="absolute bottom-6 left-2 z-30 items-start"
        onClick={(event) => {
          event.stopPropagation();
          onToggleGroupItem();
        }}
      >
        <ButtonIcon className={clsx("transition", !open && "-rotate-90")}>
          <ChevronDownIcon />
        </ButtonIcon>
        {props.count} similar changes
      </Button>
    </HotkeyTooltip>
  );
};

const DiffCard = ({
  children,
  active,
  ...props
}: React.HTMLProps<HTMLDivElement> & {
  active: boolean;
}) => {
  const ring = active
    ? "ring-3 ring-inset ring-primary-active"
    : children
      ? "ring-1 ring-inset ring-primary group-hover/item:ring-primary-hover"
      : "";

  return (
    <div
      className="relative flex h-full items-center justify-center rounded-lg overflow-hidden bg-app"
      {...props}
    >
      {children}
      <div className={clsx(ring, "absolute inset-0 z-20 rounded-lg")} />
      <div
        className={clsx(
          active && "ring-inset ring-1 ring-primary-highlight/90",
          "absolute inset-0 z-20 rounded-lg",
        )}
      />
    </div>
  );
};

interface ListItemProps {
  style: React.HTMLProps<HTMLDivElement>["style"];
  item: ListItemRow | ListGroupItemRow;
  index: number;
  active: boolean;
  setActiveDiff: (diff: Diff) => void;
  observer: IntersectionObserver | null;
  onToggleGroupItem: (groupId: string | null) => void;
}

const ListItem = ({
  style,
  item,
  index,
  active,
  setActiveDiff,
  onToggleGroupItem,
  observer,
}: ListItemProps) => {
  const pt = item.first ? "pt-4" : "pt-2";
  const pb = item.last ? "pb-4" : "pb-2";
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (observer && element) {
      observer.observe(element);
      return () => {
        observer.unobserve(element);
      };
    }
    return undefined;
  }, [observer]);
  const { searchMode } = useSearchModeState();
  const isGroupItem = item.type === "group-item";
  const isSubItem = !searchMode && item.type === "item" && item.diff?.group;

  return (
    <AriakitButton
      ref={ref}
      data-index={index}
      as="div"
      disabled={!item.diff}
      className={clsx(
        pt,
        pb,
        "group/item w-full cursor-default px-4 focus:outline-none relative",
        isSubItem && "pl-10",
      )}
      style={style}
      onClick={() => {
        if (item.diff) {
          setActiveDiff(item.diff);
        }
      }}
    >
      {isSubItem && (
        <CornerDownRightIcon
          size="1em"
          className="left-4 top-4 absolute text-low"
        />
      )}

      {isGroupItem && <CardStack isFirst={item.first} isLast={item.last} />}

      <DiffCard active={active}>
        {item.diff ? (
          <>
            {isGroupItem && (
              <ShowSubItemToggle
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleGroupItem(item.diff?.group ?? null);
                }}
                onToggleGroupItem={() =>
                  onToggleGroupItem(item.diff?.group ?? null)
                }
                count={item.group.length}
                open={item.expanded}
              />
            )}
            <DiffImage diff={item.diff} />{" "}
            <div
              className={clsx(
                "absolute bottom-0 left-0 right-0 z-10 truncate bg-app/70 bg-gradient-to-b px-2 py-1.5 text-xxs font-medium",
                !searchMode &&
                  "opacity-0 transition-opacity group-hover/sidebar:opacity-100",
              )}
            >
              {item.result ? (
                <>
                  {item.result.key.slice(
                    0,
                    Math.max(item.result.match.index, 0),
                  )}
                  <strong>
                    {item.result.key.slice(
                      Math.max(item.result.match.index, 0),
                      item.result.match.index + item.result.match.length,
                    )}
                  </strong>
                  {item.result.key.slice(
                    item.result.match.index + item.result.match.length,
                    item.result.key.length,
                  )}
                </>
              ) : (
                item.diff.name
              )}
            </div>
          </>
        ) : null}
      </DiffCard>
    </AriakitButton>
  );
};

const useInViewportIndices = (containerRef: React.RefObject<HTMLElement>) => {
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);
  const inViewportIndices = useRef<Set<number>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(
            (entry.target as HTMLDivElement).dataset["index"],
          );
          if (entry.isIntersecting) {
            inViewportIndices.current.add(index);
          } else {
            inViewportIndices.current.delete(index);
          }
        });
      },
      {
        root: containerRef.current,
      },
    );
    setObserver(observer);
    return () => {
      setObserver(null);
      observer.disconnect();
    };
  }, [containerRef]);

  const getIndicesInViewport = useCallback(() => {
    return inViewportIndices.current;
  }, []);

  return { observer, getIndicesInViewport };
};

const MAX_HEIGHT = 400;
const MIN_HEIGHT = 100;
const MAX_WIDTH = 262;
const DEFAULT_IMAGE_HEIGHT = 300;

const constraint = ({ width, height }: { width: number; height: number }) => {
  const wp = MAX_WIDTH / width;
  const hp = MAX_HEIGHT / height;
  const ratio = Math.min(wp, hp, 1);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const getDiffDimensions = (diff: Diff | null) => {
  if (diff && diff.width != null && diff.height != null) {
    return constraint({ width: diff.width, height: diff.height });
  }

  if (
    diff &&
    diff.compareScreenshot &&
    diff.compareScreenshot.width != null &&
    diff.compareScreenshot.height != null
  ) {
    return constraint({
      width: diff.compareScreenshot.width,
      height: diff.compareScreenshot.height,
    });
  }

  if (
    diff &&
    diff.baseScreenshot &&
    diff.baseScreenshot.width != null &&
    diff.baseScreenshot.height != null
  ) {
    return constraint({
      width: diff.baseScreenshot.width,
      height: diff.baseScreenshot.height,
    });
  }

  return { height: DEFAULT_IMAGE_HEIGHT, width: MAX_WIDTH };
};

const preloaded: string[] = [];
const preloadImage = (src: string) => {
  if (preloaded.includes(src)) return;
  const img = new Image();
  img.src = src;
  preloaded.push(src);
  if (preloaded.length > 1000) {
    preloaded.shift();
  }
};

const preloadListItemRow = (row: ListItemRow | ListGroupItemRow) => {
  if (row.diff?.baseScreenshot?.url) {
    preloadImage(row.diff.baseScreenshot.url);
  }
  if (row.diff?.compareScreenshot?.url) {
    preloadImage(row.diff.compareScreenshot.url);
  }
  if (row.diff?.url) {
    preloadImage(row.diff.url);
  }
};

const InternalBuildDiffList = memo(() => {
  const {
    groups,
    toggleGroup,
    expanded,
    activeDiff,
    setActiveDiff,
    initialDiff,
    firstDiff,
    scrolledDiff,
    stats,
    results,
    totalDiffCount,
  } = useBuildDiffState();
  const { searchMode } = useSearchModeState();
  const { search } = useSearchState();
  const rows = useMemo(
    () => getRows(groups, expanded, results),
    [groups, expanded, results],
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const containerRef = useRef<HTMLDivElement>(null);
  const getDiffIndex = useCallback((diff: Diff | null) => {
    if (!diff) return -1;
    return rowsRef.current.findIndex(
      (row) =>
        (row.type === "item" || row.type === "group-item") && row.diff === diff,
    );
  }, []);

  const openGroup = useCallback(
    (name: DiffGroup["name"]) => {
      const group = groups.find((g) => g.name === name);
      const firstDiff = group?.diffs[0];
      if (firstDiff) {
        setActiveDiff(firstDiff, true);
      }
    },
    [groups, setActiveDiff],
  );

  const stickyIndices = useMemo(() => {
    return rows.reduce((acc, row, index) => {
      if (row.type === "header") {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);
  }, [rows]);

  const [activeStickyIndex, setActiveStickyIndex] = useState<number>(0);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return 0;
      switch (row.type) {
        case "header": {
          const headerHeight = 34;
          return headerHeight - (row.borderBottom ? 0 : 1);
        }
        case "item":
        case "group-item": {
          const dimensions = getDiffDimensions(row.diff);
          const height = Math.max(dimensions.height, MIN_HEIGHT);
          const gap = 16;
          const mt = row.first ? gap / 2 : 0;
          const mb = row.last ? gap / 2 : 0;
          return height + gap + mt + mb;
        }
        default:
          return 0;
      }
    },
    scrollPaddingStart: 30,
    getScrollElement: () => containerRef.current,
    overscan: 20,
    rangeExtractor: useCallback(
      (range: Range) => {
        const activeStickyIndex =
          Array.from(stickyIndices)
            .reverse()
            .find((index) => range.startIndex >= index) ?? 0;

        const next = new Set([
          activeStickyIndex,
          ...defaultRangeExtractor(range),
        ]);

        setActiveStickyIndex(activeStickyIndex);

        return Array.from(next).sort((a, b) => a - b);
      },
      [stickyIndices],
    ),
  });

  const { scrollToIndex } = rowVirtualizer;
  const scrollToIndexRef = useRef(scrollToIndex);
  scrollToIndexRef.current = scrollToIndex;

  useLayoutEffect(() => {
    // Don't scroll to the first diff if the user has already scrolled
    if (firstDiff === initialDiff) return;
    const index = getDiffIndex(initialDiff);
    if (index !== -1) {
      scrollToIndexRef.current(index, {
        align: "start",
        behavior: "smooth",
      });
    }
  }, [initialDiff, firstDiff, getDiffIndex]);

  const { observer, getIndicesInViewport } = useInViewportIndices(containerRef);

  useLayoutEffect(() => {
    const index = getDiffIndex(scrolledDiff);
    if (index !== -1 && !getIndicesInViewport().has(index)) {
      scrollToIndexRef.current(index, {
        align: "start",
        behavior: "smooth",
      });
    }
  }, [scrolledDiff, getDiffIndex, getIndicesInViewport]);

  if (searchMode && search && !results.length && totalDiffCount > 0) {
    return <div className="text-sm p-4">No results</div>;
  }

  return (
    <>
      {stats && !searchMode && (
        <BuildStatsIndicator
          className="border-b-border flex shrink-0 items-center border-b px-2"
          stats={stats}
          onClickGroup={openGroup}
        />
      )}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer
            .getVirtualItems()
            .filter((e) => e)
            .map((virtualRow) => {
              const item = rows[virtualRow.index];

              if (!item) return null;

              switch (item.type) {
                case "header":
                  return (
                    <ListHeader
                      key={virtualRow.index}
                      item={item}
                      activeIndex={item.group.diffs.indexOf(activeDiff)}
                      onClick={() => {
                        toggleGroup(item.name);
                      }}
                      style={{
                        height: virtualRow.size,
                        top: 0,
                        left: 0,
                        right: 0,
                        ...(activeStickyIndex == virtualRow.index
                          ? {
                              position: "sticky",
                              borderTopColor: "transparent",
                            }
                          : {
                              position: "absolute",
                              transform: `translateY(${virtualRow.start}px)`,
                            }),
                      }}
                    />
                  );
                case "item":
                case "group-item": {
                  preloadListItemRow(item);
                  return (
                    <ListItem
                      key={virtualRow.index}
                      index={virtualRow.index}
                      style={{
                        height: virtualRow.size,
                        top: 0,
                        left: 0,
                        position: "absolute",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      item={item}
                      active={activeDiff === item.diff}
                      setActiveDiff={setActiveDiff}
                      observer={observer}
                      onToggleGroupItem={(groupId) => {
                        if (groupId) {
                          toggleGroup(groupId);
                        }
                      }}
                    />
                  );
                }
                default:
                  return null;
              }
            })}
        </div>
      </div>
    </>
  );
});

export const BuildDiffList = () => {
  const { ready } = useBuildDiffState();
  if (!ready) return null;
  return <InternalBuildDiffList />;
};
