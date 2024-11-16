import {
  ComponentPropsWithoutRef,
  forwardRef,
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
  SquareStackIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  AriaButtonProps,
  HoverProps,
  useButton,
  useObjectRef,
} from "react-aria";
import {
  Button as RACButton,
  ButtonProps as RACButtonProps,
  Tooltip as RACTooltip,
  TooltipProps as RACTooltipProps,
  TooltipTrigger,
} from "react-aria-components";

import { Badge } from "@/ui/Badge";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { getTooltipAnimationClassName } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { TwicPicture, TwicPictureProps } from "@/ui/TwicPicture";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";

import { useBuildDiffColorStyle } from "./BuildDiffColorState";
import { getGroupLabel } from "./BuildDiffGroup";
import {
  Diff,
  DiffGroup,
  DiffResult,
  useBuildDiffState,
  useSearchModeState,
  useSearchState,
} from "./BuildDiffState";
import { useBuildHotkey } from "./BuildHotkeys";
import {
  EvaluationStatus,
  useBuildDiffStatusState,
  useGetDiffEvaluationStatus,
  useGetDiffGroupEvaluationStatus,
  useWatchItemReview,
} from "./BuildReviewState";
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

const ListHeader = ({
  style,
  onClick,
  item,
  activeIndex,
}: {
  style: React.HTMLProps<HTMLButtonElement>["style"];
  onClick: RACButtonProps["onPress"];
  item: ListHeaderRow;
  activeIndex: number;
}) => {
  const borderB = item.borderBottom ? "border-b border-b-border" : "";
  return (
    <RACButton
      className={clsx(
        borderB,
        "group/list-header border-t-base bg-app data-[hovered]:bg-subtle data-[focus-visible]:bg-subtle z-10 flex w-full cursor-default select-none items-center border-t pr-2 text-left focus:outline-none",
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
      <div className="text flex-1 text-sm font-medium">
        {getGroupLabel(item.name)}
      </div>
      <Badge className="shrink-0">
        {activeIndex !== -1 ? <>{activeIndex + 1} / </> : null}
        {item.count}
      </Badge>
    </RACButton>
  );
};

function getImgAttributes(
  url: string,
  dimensions?: { width: number; height: number },
) {
  return {
    key: url,
    src: url,
    width: dimensions?.width,
    height: dimensions?.height,
    transforms: dimensions
      ? [`contain-max=${dimensions.width * 2}x${dimensions.height * 2}`]
      : [],
  };
}

const DiffImage = memo(({ diff }: { diff: Diff }) => {
  const dimensions = getDiffDimensions(diff);

  switch (diff.status) {
    case "added":
    case "unchanged":
    case "failure":
    case "retryFailure": {
      const { key, ...attrs } = getImgAttributes(
        diff.compareScreenshot!.url,
        dimensions,
      );
      return (
        <TwicPicture
          key={key}
          {...attrs}
          className="max-h-full max-w-full object-contain"
        />
      );
    }
    case "removed": {
      const { key, ...attrs } = getImgAttributes(
        diff.baseScreenshot!.url,
        dimensions,
      );
      return (
        <TwicPicture
          key={key}
          {...attrs}
          className="max-h-full max-w-full object-contain"
        />
      );
    }
    case "changed": {
      const dimensions = getDiffDimensions(diff);
      const { key: compareKey, ...compareAttrs } = getImgAttributes(
        diff.compareScreenshot!.url,
      );
      const { key: diffKey, ...diffAttrs } = getImgAttributes(
        diff.url!,
        dimensions,
      );
      return (
        <div className="flex h-full items-center justify-center">
          <div
            className="relative"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <TwicPicture
              key={compareKey}
              {...compareAttrs}
              className="opacity-disabled absolute w-full"
            />
            <DiffPicture
              key={diffKey}
              {...diffAttrs}
              className="relative z-10 max-h-full w-full"
            />
          </div>
        </div>
      );
    }
    default:
      return null;
  }
});

function DiffPicture(props: TwicPictureProps) {
  const style = useBuildDiffColorStyle();
  return <TwicPicture {...props} style={{ ...style, ...props.style }} />;
}

const CardStack = ({
  isFirst,
  isLast,
  status,
}: {
  isFirst: boolean;
  isLast: boolean;
  status: EvaluationStatus | null;
}) => {
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
};

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

function DiffCard(props: {
  active: boolean;
  status: EvaluationStatus;
  className?: string;
  children: React.ReactNode;
}) {
  const { active, status, children, className } = props;
  const ring = (() => {
    switch (status) {
      case EvaluationStatus.Accepted:
        return active
          ? "ring-3 ring-inset ring-success-active"
          : children
            ? "ring-1 ring-inset ring-success group-hover/item:ring-success-hover"
            : "";
      case EvaluationStatus.Rejected:
        return active
          ? "ring-3 ring-inset ring-danger-active"
          : children
            ? "ring-1 ring-inset ring-danger group-hover/item:ring-danger-hover"
            : "";
      case EvaluationStatus.Pending:
        return active
          ? "ring-3 ring-inset ring-primary-active"
          : children
            ? "ring-1 ring-inset ring-primary group-hover/item:ring-primary-hover"
            : "";
      default:
        assertNever(status);
    }
  })();

  return (
    <div
      className={clsx(
        "bg-app relative flex h-full items-center justify-center overflow-hidden rounded-lg",
        className,
      )}
    >
      {children}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 rounded-lg",
          ring,
        )}
      />
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 rounded-lg",
          active && "ring-primary-highlight ring-1 ring-inset",
        )}
      />
    </div>
  );
}

function EvaluationStatusIndicator(props: { status: EvaluationStatus }) {
  const value = (() => {
    switch (props.status) {
      case EvaluationStatus.Accepted:
        return { color: "text-success", icon: ThumbsUpIcon };
      case EvaluationStatus.Rejected:
        return { color: "text-danger", icon: ThumbsDownIcon };
      case EvaluationStatus.Pending:
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

function ListItem({
  style,
  item,
  index,
  active,
  setActiveDiff,
  onToggleGroupItem,
  observer,
  isHovered,
  onHoverChange,
}: {
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
  const groupStatus = getDiffGroupStatus(item.diff?.group ?? null);
  const isGroupItem = item.type === "group-item";
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
      className="group/item relative size-full cursor-default text-left focus:outline-none"
      onPress={() => {
        if (item.diff) {
          setActiveDiff(item.diff);
        }
      }}
      isDisabled={!item.diff}
      {...hoverProps}
    >
      <DiffCard active={active} status={status}>
        {item.diff ? (
          <>
            <DiffImage diff={item.diff} />
            <div
              className={clsx(
                "bg-app absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 truncate px-2",
                !searchMode && status === EvaluationStatus.Pending
                  ? "opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/sidebar:opacity-100"
                  : null,
              )}
            >
              <EvaluationStatusIndicator status={status} />
              <Truncable className="bg-app text-xxs flex-1 pb-1.5 pt-1 font-medium">
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
              </Truncable>
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
            </div>
          </>
        ) : null}
      </DiffCard>
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
        clsx("pointer-events-none w-60", getTooltipAnimationClassName(props))
      }
      style={{ zIndex: 900 }}
    >
      <DiffCard active={false} status={props.status}>
        <DiffImage diff={diff} />
      </DiffCard>
    </RACTooltip>
  );
}

const ListItemButton = forwardRef(function ListItemButton(
  props: Pick<AriaButtonProps<"div">, "onPress" | "isDisabled"> &
    Pick<HoverProps, "onHoverChange"> &
    ComponentPropsWithoutRef<"div">,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const { onPress, isDisabled, ...rest } = props;
  const { buttonProps } = useButton(
    {
      elementType: "div",
      onPress,
      isDisabled,
    },
    ref,
  );
  return <div ref={ref} {...rest} {...buttonProps} />;
});

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
            invariant(row.diff?.group);
            return getDiffGroupStatus(row.diff.group);
          case "item":
            invariant(row.diff);
            return getDiffStatus(row.diff.id);
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

    const dimensions = getDiffDimensions(row.diff);
    return Math.max(dimensions.height, MIN_HEIGHT);
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
    totalDiffCount,
  } = useBuildDiffState();
  const { searchMode } = useSearchModeState();
  const { search } = useSearchState();
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

  if (searchMode && search && !results.length && totalDiffCount > 0) {
    return <div className="p-4 text-sm">No results</div>;
  }

  return (
    <>
      {stats && !searchMode && (
        <BuildStatsIndicator
          className="border-b-base flex shrink-0 items-center overflow-x-auto border-b px-2"
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
            })}
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
