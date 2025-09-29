import {
  cloneElement,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import {
  defaultRangeExtractor,
  Range,
  useVirtualizer,
} from "@tanstack/react-virtual";
import { clsx } from "clsx";
import {
  ChevronDownIcon,
  CornerDownRightIcon,
  ImagesIcon,
  SquareStackIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  Heading,
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Tooltip as RACTooltip,
  TooltipProps as RACTooltipProps,
  Text,
  TooltipTrigger,
} from "react-aria-components";

import {
  getGroupIcon,
  getGroupLabel,
  type DiffGroup,
} from "@/containers/Build/BuildDiffGroup";
import {
  DiffCard,
  DiffCardFooter,
  DiffCardFooterText,
  DiffImage,
  getDiffDimensions,
  ListItemButton,
  type DiffCardProps,
} from "@/containers/Build/BuildDiffListPrimitives";
import { NoScreenshotsBuildEmptyState } from "@/containers/Build/BuildEmptyStates";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { Badge } from "@/ui/Badge";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { EmptyState, EmptyStateIcon } from "@/ui/Layout";
import { getTooltipAnimationClassName } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";

import {
  Diff,
  DiffResult,
  useBuildDiffState,
  useSearchModeState,
} from "./BuildDiffState";
import {
  EvaluationStatus,
  useBuildDiffStatusState,
  useGetDiffEvaluationStatus,
  useGetDiffGroupEvaluationStatus,
  useWatchItemReview,
} from "./BuildReviewState";
import { BuildStatsIndicator } from "./BuildStatsIndicator";

const DIFF_IMAGE_CONFIG = {
  maxWidth: 262,
  maxHeight: 400,
  defaultHeight: 300,
  minHeight: 100,
};

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

function createHeaderRow(input: {
  group: DiffGroup;
  expanded: boolean;
  borderBottom: boolean;
}): ListHeaderRow {
  return {
    type: "header",
    name: input.group.name,
    count: input.group.diffs.length,
    expanded: input.expanded,
    borderBottom: input.borderBottom,
    group: input.group,
  };
}

function createListItemRow(input: {
  diff: Diff | null;
  first: boolean;
  last: boolean;
  result: DiffResult | null;
}): ListItemRow {
  return {
    type: "item",
    diff: input.diff,
    first: input.first,
    last: input.last,
    result: input.result,
  };
}

function createGroupItemRow(input: {
  diff: Diff;
  first: boolean;
  last: boolean;
  expanded: boolean;
  result: DiffResult | null;
}): ListGroupItemRow {
  return {
    type: "group-item",
    diff: input.diff,
    first: input.first,
    last: input.last,
    result: input.result,
    expanded: input.expanded,
    group: [input.diff],
  };
}

function getRows(
  groups: DiffGroup[],
  expandedGroups: string[],
  results: DiffResult[],
  searchMode: boolean,
): ListRow[] {
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
        if (!isGroupExpanded) {
          return initialRows;
        }

        return group.diffs.reduce((acc, diff, index, diffs) => {
          const first = index === 0;
          const last = index === diffs.length - 1;
          const result = results.find((r) => r.item === diff) ?? null;

          // If the diff is not part of a group, return a single item row
          if (searchMode || !diff?.group || Boolean(result)) {
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
}

function ListHeader(props: {
  style: React.HTMLProps<HTMLButtonElement>["style"];
  onClick: RACButtonProps["onPress"];
  item: ListHeaderRow;
  activeIndex: number;
}) {
  const { style, onClick, item, activeIndex } = props;
  const borderB = item.borderBottom ? "border-b border-b-border" : "";
  return (
    <RACButton
      className={clsx(
        borderB,
        "group/list-header bg-app data-[hovered]:bg-subtle data-[focus-visible]:bg-subtle focus:outline-hidden z-10 flex w-full cursor-default select-none items-center border-t pr-2 text-left",
      )}
      style={style}
      onPress={onClick}
    >
      <ChevronDownIcon
        className={clsx(
          "text-low m-[0.1875rem] size-2.5 shrink-0 opacity-0 transition group-hover/sidebar:opacity-100 group-data-[focus-visible]/list-header:opacity-100",
          !item.expanded && "-rotate-90",
        )}
      />
      {cloneElement(getGroupIcon(item.name), {
        className: "size-3 mr-1.5 text-low",
      })}
      <div className="text-default flex-1 text-sm font-medium">
        {getGroupLabel(item.name)}
      </div>
      <Badge className="shrink-0">
        {activeIndex !== -1 ? <>{activeIndex + 1} / </> : null}
        {item.count}
      </Badge>
    </RACButton>
  );
}

function CardStack(props: {
  isFirst: boolean;
  isLast: boolean;
  status: EvaluationStatus | null;
}) {
  const { isFirst, isLast, status } = props;
  return (
    <div
      className={clsx(
        "absolute right-2 -z-10 block w-[262px] rounded-lg border",
        isFirst ? "top-6" : "top-4",
        isLast ? "bottom-2" : "bottom-0",
        status === EvaluationStatus.Accepted && "bg-success-hover",
        status === EvaluationStatus.Rejected && "bg-danger-hover",
        status === null && "bg-hover",
      )}
      tabIndex={-1}
    />
  );
}

function ShowSubItemToggle(
  props: ButtonProps & {
    count: number;
    open: boolean;
    onToggleGroupItem: () => void;
    active: boolean;
  },
) {
  const { open, onToggleGroupItem } = props;

  const toggleDiff = useBuildHotkey(
    "toggleDiffGroup",
    () => {
      if (props.active) {
        onToggleGroupItem();
      }
    },
    { preventDefault: true },
  );

  if (props.count === 0) {
    return null;
  }

  return (
    <HotkeyTooltip
      description={open ? "Collapse group" : "Expand group"}
      keys={toggleDiff.displayKeys}
    >
      <Button
        variant="secondary"
        size="small"
        onPress={() => {
          onToggleGroupItem();
        }}
      >
        <ButtonIcon className={clsx("transition", !open && "-rotate-90")}>
          <div>
            {open ? (
              <ChevronDownIcon className="size-[1em]" />
            ) : (
              <SquareStackIcon className="size-[1em]" />
            )}
          </div>
        </ButtonIcon>
        {props.count} similar
      </Button>
    </HotkeyTooltip>
  );
}

function EvaluationStatusIndicator(props: { status: EvaluationStatus | null }) {
  const value = (() => {
    switch (props.status) {
      case EvaluationStatus.Accepted:
        return { color: "text-success", icon: ThumbsUpIcon };
      case EvaluationStatus.Rejected:
        return { color: "text-danger", icon: ThumbsDownIcon };
      case EvaluationStatus.Pending:
      case null:
        return null;
      default:
        assertNever(props.status);
    }
  })();
  if (!value) {
    return null;
  }
  const Icon = value.icon;
  return (
    <div className={value.color}>
      <Icon className="size-3" />
    </div>
  );
}

let warmup = false;
let cooldownTimeout: NodeJS.Timeout | null = null;

function useDelayedHover(props: {
  delay: number;
  cooldownDelay: number;
  onHoverChange: (isHovered: boolean) => void;
}) {
  const [entered, setEntered] = useState(false);
  const onHoverChangeRef = useLiveRef(props.onHoverChange);
  useLayoutEffect(() => {
    const onHoverChange = onHoverChangeRef.current;

    if (entered) {
      const timeout = setTimeout(
        () => {
          onHoverChange(true);
          warmup = true;
          if (cooldownTimeout) {
            clearTimeout(cooldownTimeout);
            cooldownTimeout = null;
          }
        },
        warmup ? 0 : props.delay,
      );
      return () => {
        clearTimeout(timeout);
      };
    }

    onHoverChange(false);
    cooldownTimeout = setTimeout(() => {
      warmup = false;
    }, props.cooldownDelay);
    return undefined;
  }, [entered, onHoverChangeRef, props.delay, props.cooldownDelay]);

  return {
    hoverProps: {
      onMouseEnter: () => setEntered(true),
      onMouseLeave: () => setEntered(false),
    },
  };
}

function ListItem(props: {
  style: React.HTMLProps<HTMLButtonElement>["style"];
  item: ListItemRow | ListGroupItemRow;
  index: number;
  active: boolean;
  setActiveDiff: (diff: Diff) => void;
  observer: IntersectionObserver | null;
  onToggleGroupItem: (groupId: string | null) => void;
  isHovered: boolean;
  onHoverChange: (isHovered: boolean) => void;
}) {
  const {
    style,
    item,
    index,
    active,
    setActiveDiff,
    observer,
    onToggleGroupItem,
    isHovered,
    onHoverChange,
  } = props;
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
  const [status] = useBuildDiffStatusState({
    diffId: item.diff?.id ?? null,
    diffGroup: null,
  });
  const getDiffGroupStatus = useGetDiffGroupEvaluationStatus();
  const groupStatus = getDiffGroupStatus?.(item.diff?.group ?? null) ?? null;
  const isGroupItem = item.type === "group-item" && item.group.length > 1;
  const isSubItem = !searchMode && item.type === "item" && item.diff?.group;
  const { hoverProps } = useDelayedHover({
    onHoverChange,
    delay: 1000,
    cooldownDelay: 800,
  });

  const rowStyle = getRowStyle(item, status);

  const button = (
    <ListItemButton
      ref={ref}
      data-index={index}
      onPress={() => {
        if (item.diff) {
          setActiveDiff(item.diff);
        }
      }}
      isDisabled={!item.diff}
      className="size-full"
      {...hoverProps}
    >
      <StatusDiffCard isActive={active} status={status}>
        {item.diff ? (
          <>
            <DiffImage diff={item.diff} config={DIFF_IMAGE_CONFIG} />
            <DiffCardFooter
              alwaysVisible={searchMode || status !== EvaluationStatus.Pending}
            >
              <EvaluationStatusIndicator status={status} />
              <DiffCardFooterText>
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
              </DiffCardFooterText>
              {isGroupItem && (
                <div className="shrink-0 py-2">
                  <ShowSubItemToggle
                    onPress={() => {
                      onToggleGroupItem(item.diff?.group ?? null);
                    }}
                    onToggleGroupItem={() =>
                      onToggleGroupItem(item.diff?.group ?? null)
                    }
                    count={item.group.length}
                    open={item.expanded}
                    active={active}
                  />
                </div>
              )}
            </DiffCardFooter>
          </>
        ) : null}
      </StatusDiffCard>
    </ListItemButton>
  );

  const isEvaluated =
    status === EvaluationStatus.Accepted ||
    status === EvaluationStatus.Rejected;

  return (
    <div
      className={clsx("relative w-full px-4", isSubItem && "pl-10")}
      style={{ ...rowStyle, ...style }}
    >
      {isGroupItem && (
        <CardStack
          isFirst={item.first}
          isLast={item.last}
          status={groupStatus}
        />
      )}
      {isSubItem && (
        <CornerDownRightIcon
          size="1em"
          className="text-low absolute"
          style={{ top: 8, left: 16 }}
        />
      )}
      {isEvaluated && item.diff ? (
        <TooltipTrigger delay={0} closeDelay={0} isOpen={isHovered}>
          {button}
          <DiffTooltip status={status} diff={item.diff} triggerRef={ref} />
        </TooltipTrigger>
      ) : (
        button
      )}
    </div>
  );
}

function DiffTooltip(props: {
  diff: Diff;
  status: EvaluationStatus;
  triggerRef: RACTooltipProps["triggerRef"];
}) {
  const { diff } = props;
  return (
    <RACTooltip
      triggerRef={props.triggerRef}
      placement="right top"
      offset={8}
      className={(props) =>
        clsx(
          "z-hover-card pointer-events-none w-60",
          getTooltipAnimationClassName(props),
        )
      }
    >
      <StatusDiffCard isActive={false} status={props.status}>
        <DiffImage diff={diff} config={DIFF_IMAGE_CONFIG} />
      </StatusDiffCard>
    </RACTooltip>
  );
}

function StatusDiffCard(
  props: Omit<DiffCardProps, "variant"> & {
    status: EvaluationStatus | null;
  },
) {
  const variant = (() => {
    switch (props.status) {
      case EvaluationStatus.Accepted:
        return "success" as const;
      case EvaluationStatus.Rejected:
        return "danger" as const;
      case EvaluationStatus.Pending:
      case null:
        return "primary" as const;
      default:
        assertNever(props.status);
    }
  })();
  return <DiffCard {...props} variant={variant} />;
}

function useInViewportIndices(
  containerRef: React.RefObject<HTMLElement | null>,
) {
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
}

const preloaded: string[] = [];
const preloadImage = (src: string) => {
  if (preloaded.includes(src)) {
    return;
  }
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

function useEstimateListItemHeight() {
  const getDiffGroupStatus = useGetDiffGroupEvaluationStatus();
  const getDiffStatus = useGetDiffEvaluationStatus();
  return useCallback(
    (row: ListItemRow | ListGroupItemRow) => {
      const status = (() => {
        switch (row.type) {
          case "group-item":
            invariant(
              row.diff?.group,
              "Expected group item to have a diff and a group",
            );
            return getDiffGroupStatus?.(row.diff.group) ?? null;
          case "item":
            if (!row.diff) {
              return null;
            }
            return getDiffStatus?.(row.diff.id) ?? null;
          default:
            assertNever(row);
        }
      })();

      const style = getRowStyle(row, status);
      return style.height;
    },
    [getDiffGroupStatus, getDiffStatus],
  );
}

/**
 * Get the height and padding of the row based on the row type and status.
 */
function getRowStyle(
  row: ListItemRow | ListGroupItemRow,
  status: EvaluationStatus | null,
) {
  const isEvaluated =
    status === EvaluationStatus.Accepted ||
    status === EvaluationStatus.Rejected;

  const innerHeight = (() => {
    if (isEvaluated) {
      switch (row.type) {
        case "group-item":
          return 42;
        case "item":
          return 26;
        default:
          assertNever(row);
      }
    }

    const dimensions = getDiffDimensions(row.diff, DIFF_IMAGE_CONFIG);
    return Math.max(dimensions.height, DIFF_IMAGE_CONFIG.minHeight);
  })();

  const gap = 12;
  const paddingTop = row.first ? gap : gap / 2;
  const paddingBottom = row.last ? gap : gap / 2;
  return {
    height: innerHeight + paddingTop + paddingBottom,
    paddingTop,
    paddingBottom,
  };
}

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
    hasNoResults,
  } = useBuildDiffState();
  const { searchMode } = useSearchModeState();
  const rows = useMemo(
    () => getRows(groups, expanded, results, searchMode),
    [groups, expanded, results, searchMode],
  );
  const rowsRef = useLiveRef(rows);
  const containerRef = useRef<HTMLDivElement>(null);
  const getDiffIndex = useEventCallback((diff: Diff | null) => {
    if (!diff) {
      return -1;
    }
    return rows.findIndex(
      (row) =>
        (row.type === "item" || row.type === "group-item") && row.diff === diff,
    );
  });

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
  const estimateListItemHeight = useEstimateListItemHeight();
  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) {
        return 0;
      }
      switch (row.type) {
        case "header": {
          const headerHeight = 34;
          return headerHeight - (row.borderBottom ? 0 : 1);
        }
        case "item":
        case "group-item": {
          return estimateListItemHeight(row);
        }
        default:
          return 0;
      }
    },
    [estimateListItemHeight, rows],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize,
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

  const { resizeItem } = rowVirtualizer;

  const watchItemReview = useWatchItemReview();
  useEffect(() => {
    if (!watchItemReview) {
      return;
    }
    return watchItemReview((value) => {
      const rows = rowsRef.current;
      rows.forEach((row, index) => {
        if (row.type === "item" && row.diff?.id === value.id) {
          resizeItem(index, estimateSize(index));
          return;
        }
        if (
          row.type === "group-item" &&
          row.group?.some((diff) => diff.id === value.id)
        ) {
          resizeItem(index, estimateSize(index));
        }
      });
    });
  }, [estimateSize, resizeItem, rowsRef, watchItemReview]);

  const { scrollToIndex } = rowVirtualizer;
  const scrollToIndexRef = useRef(scrollToIndex);
  scrollToIndexRef.current = scrollToIndex;

  useLayoutEffect(() => {
    // Don't scroll to the first diff if the user has already scrolled
    if (firstDiff === initialDiff) {
      return;
    }
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

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <>
      {stats && !searchMode && (
        <BuildStatsIndicator
          className="shrink-0 border-b px-2"
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
          {(() => {
            if (hasNoResults) {
              return (
                <EmptyState>
                  <EmptyStateIcon>
                    <ImagesIcon />
                  </EmptyStateIcon>
                  <Heading>No screenshots</Heading>
                  <Text slot="description">
                    This build has no screenshots matching the current search.
                  </Text>
                </EmptyState>
              );
            }

            const virtualItems = rowVirtualizer
              .getVirtualItems()
              .filter((x) => x);

            if (virtualItems.length === 0 && !searchMode) {
              return <NoScreenshotsBuildEmptyState />;
            }

            return virtualItems.map((virtualRow) => {
              const item = rows[virtualRow.index];

              if (!item) {
                return null;
              }

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
                      onHoverChange={(isHovered) => {
                        setHoveredIndex(isHovered ? virtualRow.index : null);
                      }}
                      isHovered={hoveredIndex === virtualRow.index}
                    />
                  );
                }
                default:
                  return null;
              }
            });
          })()}
        </div>
      </div>
    </>
  );
});

export function BuildDiffList() {
  const { ready } = useBuildDiffState();
  if (!ready) {
    return null;
  }
  return <InternalBuildDiffList />;
}
