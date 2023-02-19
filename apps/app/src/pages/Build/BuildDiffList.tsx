import { ChevronDownIcon } from "@heroicons/react/20/solid";
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
import { FlakyIndicatorIcon } from "@/ui/FlakyIndicator";

import { getGroupLabel } from "./BuildDiffGroup";
import { Diff, DiffGroup, useBuildDiffState } from "./BuildDiffState";
import { BuildStatsIndicator } from "./BuildStatsIndicator";

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
}

type ListRow = ListHeaderRow | ListItemRow;

const getRows = (
  groups: DiffGroup[],
  expandedGroups: DiffGroup["name"][]
): ListRow[] => {
  const filledGroups = groups.filter((group) => group.diffs.length > 0);
  return filledGroups.flatMap((group, groupIndex) => {
    const last = groupIndex === filledGroups.length - 1;
    const expanded = expandedGroups.includes(group.name);
    const borderBottom = last || expanded;
    const header: ListHeaderRow = {
      type: "header" as const,
      name: group.name,
      count: group.diffs.length,
      expanded,
      borderBottom,
      group,
    };
    if (expanded) {
      return [
        header,
        ...group.diffs.map((diff, index) => ({
          type: "item" as const,
          diff,
          first: index === 0,
          last: index === group.diffs.length - 1,
        })),
      ];
    }
    return [header];
  });
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
        "z-10 flex cursor-default select-none items-center border-t border-t-border bg-black pr-4 hover:bg-slate-900"
      )}
      style={style}
      onClick={onClick}
    >
      <ChevronDownIcon
        className={clsx(
          "m-0.5 h-3 w-3 flex-shrink-0 transform text-on-light opacity-0 transition group-hover/sidebar:opacity-100",
          !item.expanded && "rotate-[-90deg]"
        )}
      />
      <div className="flex-1 text-sm font-medium text-on">
        {getGroupLabel(item.name)}
      </div>
      <Badge className="flex-shrink-0">
        {activeIndex !== -1 ? <>{activeIndex + 1} / </> : null}
        {item.count}
      </Badge>
    </AriakitButton>
  );
};

const getImgAttributes = (
  url: string,
  dimensions?: { width: number; height: number }
) => {
  const src = dimensions
    ? `${url}?tr=w-${dimensions.width},h-${dimensions.height},c-at_max,dpr-2`
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

interface ListItemProps {
  style: React.HTMLProps<HTMLDivElement>["style"];
  item: ListItemRow;
  index: number;
  active: boolean;
  setActiveDiff: (diff: Diff) => void;
  observer: IntersectionObserver | null;
}

const ListItem = ({
  style,
  item,
  index,
  active,
  setActiveDiff,
  observer,
}: ListItemProps) => {
  const pt = item.first ? "pt-4" : "pt-2";
  const pb = item.last ? "pb-4" : "pb-2";
  const ring = active
    ? "ring-1 ring-inset ring-sky-500"
    : item.diff
    ? "ring-1 ring-inset ring-transparent group-hover/item:ring-sky-800"
    : "";
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
  return (
    <AriakitButton
      ref={ref}
      data-index={index}
      as="div"
      disabled={!item.diff}
      className={clsx(
        pt,
        pb,
        "group/item w-full cursor-default px-4 focus:outline-none"
      )}
      style={style}
      onClick={() => {
        if (item.diff) {
          setActiveDiff(item.diff);
        }
      }}
    >
      <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-slate-800/50">
        {item.diff ? (
          <>
            {item.diff.flakyDetected && <FlakyIndicatorIcon />}
            <DiffImage diff={item.diff} />{" "}
            <div className="absolute bottom-0 left-0 right-0 z-10 truncate bg-gradient-to-b from-transparent to-black/70 px-2 pb-2 pt-4 text-xxs font-medium opacity-0 transition group-hover/sidebar:opacity-100">
              {item.diff.name}
            </div>
          </>
        ) : null}
        <div className={clsx(ring, "absolute inset-0 z-20 rounded-lg")} />
      </div>
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
            (entry.target as HTMLDivElement).dataset["index"]
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
      }
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
const MAX_WIDTH = 247;
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

const preloadListItemRow = (row: ListItemRow) => {
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
    scrolledDiff,
    stats,
  } = useBuildDiffState();
  const rows = useMemo(() => getRows(groups, expanded), [groups, expanded]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const containerRef = useRef<HTMLDivElement>(null);
  const getDiffIndex = useCallback((diff: Diff | null) => {
    if (!diff) return -1;
    return rowsRef.current.findIndex(
      (row) => row.type === "item" && row.diff === diff
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
    [groups, setActiveDiff]
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
        case "item": {
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
      [stickyIndices]
    ),
  });

  const { scrollToIndex } = rowVirtualizer;
  const scrollToIndexRef = useRef(scrollToIndex);
  scrollToIndexRef.current = scrollToIndex;

  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const index = getDiffIndex(initialDiff);
    if (index !== -1) {
      scrollToIndexRef.current(index, {
        align: "start",
        smoothScroll: false,
      });
    }
    // This is a hack to ensure that everything is setup before we start
    setTimeout(() => {
      setVisible(true);
    });
  }, [initialDiff, getDiffIndex]);

  const { observer, getIndicesInViewport } = useInViewportIndices(containerRef);

  useLayoutEffect(() => {
    const index = getDiffIndex(scrolledDiff);
    if (index !== -1 && !getIndicesInViewport().has(index)) {
      scrollToIndexRef.current(index, {
        align: "start",
        smoothScroll: false,
      });
    }
  }, [scrolledDiff, getDiffIndex, getIndicesInViewport]);

  return (
    <>
      {stats && (
        <BuildStatsIndicator
          className="flex flex-shrink-0 items-center border-b border-b-border px-2"
          stats={stats}
          onClickGroup={openGroup}
        />
      )}
      <div
        ref={containerRef}
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto",
          !visible && "opacity-0"
        )}
      >
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
                case "item": {
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
