import {
  memo,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
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
  HomeIcon,
  ImagesIcon,
  SquareStackIcon,
} from "lucide-react";
import memoize from "memoize";

import {
  getDiffGroupDefinition,
  type DiffGroupName,
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
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
} from "@/ui/Layout";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";
import { lowTextColorClassNames } from "@/util/colors";

import {
  Diff,
  DiffResult,
  getDiffListStatus,
  getFirstListedStatus,
  useBuildDiffState,
  useSearchModeState,
  type DiffListGroup,
} from "./BuildDiffState";
import { getBuildOverviewURL, useBuildParams } from "./BuildParams";
import {
  useGetDiffGroupEvaluationStatus,
  useGetDiffStatus,
} from "./BuildReviewState";
import { BuildStatsIndicator } from "./BuildStatsIndicator";
import { EvaluationStatus } from "./EvaluationStatus";
import { FilterStateContext } from "./metadata/filters/FilterState";
import {
  useSnapshotDisplay,
  type SnapshotDisplay,
  type SnapshotGrouping,
} from "./SnapshotListPreferences";

const DIFF_IMAGE_CONFIG = {
  maxWidth: 262,
  maxHeight: 400,
  defaultHeight: 300,
  minHeight: 100,
};

const NAME_ROW_HEIGHT = 28;

interface ListHeaderRow {
  key: string;
  type: "header";
  name: string;
  count: number;
  expanded: boolean;
  borderBottom: boolean;
  group: DiffListGroup;
}

interface ListItemRow {
  key: string;
  type: "item";
  first: boolean;
  last: boolean;
  diff: Diff;
  result: DiffResult | null;
  parent: ListGroupItemRow | null;
}

interface ListGroupItemRow {
  key: string;
  type: "group-item";
  first: boolean;
  last: boolean;
  diff: Diff;
  result: DiffResult | null;
  expanded: boolean;
  group: Set<Diff>;
}

type ListRow = ListHeaderRow | ListItemRow | ListGroupItemRow;

function createHeaderRow(input: {
  group: DiffListGroup;
  expanded: boolean;
  borderBottom: boolean;
}): ListHeaderRow {
  return {
    key: `header-${input.group.name}`,
    type: "header",
    name: input.group.name,
    count: input.group.diffs.length,
    expanded: input.expanded,
    borderBottom: input.borderBottom,
    group: input.group,
  };
}

function createListItemRow(input: {
  diff: Diff;
  first: boolean;
  last: boolean;
  result?: DiffResult | null;
  parent?: ListGroupItemRow | null;
}): ListItemRow {
  return {
    key: `item-${input.diff.id}`,
    type: "item",
    diff: input.diff,
    first: input.first,
    last: input.last,
    result: input.result ?? null,
    parent: input.parent ?? null,
  };
}

const memoCreateListItemRow = memoize(createListItemRow, {
  cacheKey: ([input]) =>
    [
      input.diff.id,
      input.first,
      input.last,
      input.result ? JSON.stringify(input.result.match) : null,
      input.parent?.key,
    ].join(""),
});

function createGroupItemRow(input: {
  diff: Diff;
  first: boolean;
  last: boolean;
  expanded: boolean;
  result: DiffResult | null;
}): ListGroupItemRow {
  return {
    key: `group-item-${input.diff.id}`,
    type: "group-item",
    diff: input.diff,
    first: input.first,
    last: input.last,
    result: input.result,
    expanded: input.expanded,
    group: new Set([input.diff]),
  };
}

function getRows(
  groups: DiffListGroup[],
  expandedGroups: ReadonlySet<string>,
  results: DiffResult[],
  searchMode: boolean,
  journeyMode: boolean,
): ListRow[] {
  const rows: ListRow[] = [];
  const nonEmptyGroups = groups.filter((group) => group.diffs.length > 0);
  nonEmptyGroups.forEach((group, groupIndex) => {
    const isLastGroup = groupIndex === nonEmptyGroups.length - 1;
    const isGroupExpanded = expandedGroups.has(group.name);

    rows.push(
      createHeaderRow({
        group,
        expanded: isGroupExpanded,
        borderBottom: isLastGroup || isGroupExpanded,
      }),
    );

    if (!isGroupExpanded) {
      return;
    }

    // Listed by test, similar diffs are not stacked: they mostly come from
    // other tests.
    const stackSizes = new Map<string, number>();
    if (!searchMode && group.type === "status") {
      for (const diff of group.diffs) {
        if (diff.group) {
          stackSizes.set(diff.group, (stackSizes.get(diff.group) ?? 0) + 1);
        }
      }
    }

    let currentGroupItem: ListGroupItemRow | null = null;

    group.diffs.forEach((diff, index, diffs) => {
      const first = index === 0;
      const last = index === diffs.length - 1;

      // A journey is walked screen by screen, so it shows no stacks either.
      if (journeyMode) {
        rows.push(memoCreateListItemRow({ diff, first, last }));
        return;
      }

      // In search mode, we don't show groups.
      if (searchMode) {
        const result = results.find((r) => r.item === diff) ?? null;
        if (result) {
          rows.push(memoCreateListItemRow({ diff, first, last, result }));
        }
        return;
      }

      // A diff alone in its stack is listed on its own.
      if (!diff.group || (stackSizes.get(diff.group) ?? 0) < 2) {
        rows.push(memoCreateListItemRow({ diff, first, last }));
        return;
      }

      const expanded = expandedGroups.has(diff.group);

      // If the diff is part the last group.
      if (currentGroupItem && diff.group === currentGroupItem.diff.group) {
        // Update the group count.
        currentGroupItem.group.add(diff);

        // If the group is expanded, add an item row.
        if (expanded) {
          rows.push(
            memoCreateListItemRow({
              diff,
              first,
              last,
              parent: currentGroupItem,
            }),
          );
          return;
        }

        // If the diff is collapsed, update the last flag.
        currentGroupItem.last = last;
        return;
      }

      // Built afresh on each pass, not memoized: the loop goes on to add to
      // its stack and move its `last`.
      currentGroupItem = createGroupItemRow({
        diff,
        first,
        last,
        expanded,
        result: null,
      });
      rows.push(currentGroupItem);
    });
  });
  return rows;
}

function ListHeader(props: {
  style: React.HTMLProps<HTMLButtonElement>["style"];
  onClick: ComponentPropsWithRef<"button">["onClick"];
  item: ListHeaderRow;
  activeIndex: number;
  testStatuses: ReadonlyMap<string, DiffGroupName>;
}) {
  const { style, onClick, item, activeIndex, testStatuses } = props;
  const borderB = item.borderBottom ? "border-b-thin" : "";
  return (
    <button
      type="button"
      className={clsx(
        borderB,
        "group/list-header bg-app hover:bg-subtle focus-visible:bg-subtle border-t-thin z-10 flex w-full cursor-default items-center gap-1.5 pr-2 text-left select-none focus:outline-hidden",
      )}
      style={style}
      onClick={onClick}
    >
      <ChevronDownIcon
        className={clsx(
          "text-low m-0.75 -mr-0.75 size-2.5 shrink-0 opacity-0 transition group-hover/sidebar:opacity-100 group-focus-visible/list-header:opacity-100",
          !item.expanded && "-rotate-90",
        )}
      />
      <ListHeaderLabel group={item.group} testStatuses={testStatuses} />
      <Badge className="shrink-0">
        {activeIndex !== -1 ? <>{activeIndex + 1} / </> : null}
        {item.count}
      </Badge>
    </button>
  );
}

function ListHeaderLabel(props: {
  group: DiffListGroup;
  testStatuses: ReadonlyMap<string, DiffGroupName>;
}) {
  const { group, testStatuses } = props;
  switch (group.type) {
    case "status": {
      const def = getDiffGroupDefinition(group.name);
      return (
        <>
          <def.icon className="text-low size-3 shrink-0" />
          <div className="text-default flex-1 text-sm font-medium">
            {def.label}
          </div>
        </>
      );
    }
    case "test": {
      const status = testStatuses.get(group.name);
      invariant(status, "every test group has a status");
      return (
        <>
          <DiffStatusIndicator group={status} />
          {/* The title keeps the room it needs, the path takes what is left:
              its basis is 0, so it truncates first. */}
          <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
            {group.test ? (
              <>
                <Truncable className="text-default min-w-0 text-sm font-medium">
                  {group.test.title}
                </Truncable>
                {group.test.prefix ? (
                  <span className="text-low min-w-0 flex-1 truncate text-xs">
                    {group.test.prefix}
                  </span>
                ) : null}
              </>
            ) : (
              <div className="text-low text-sm font-medium">No test</div>
            )}
          </div>
        </>
      );
    }
    default:
      assertNever(group);
  }
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

function ShowSubItemToggle(props: {
  count: number;
  open: boolean;
  onToggleGroupItem: () => void;
  active: boolean;
}) {
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
        onClick={() => {
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
        {props.count - 1} similar
      </Button>
    </HotkeyTooltip>
  );
}

function DiffStatusIcon(props: { group: DiffGroupName }) {
  const def = getDiffGroupDefinition(props.group);
  return (
    <def.icon
      className={clsx("size-3 shrink-0", lowTextColorClassNames[def.color])}
    />
  );
}

function DiffStatusIndicator(props: { group: DiffGroupName }) {
  return (
    <Tooltip content={getDiffGroupDefinition(props.group).label}>
      <DiffStatusIcon group={props.group} />
    </Tooltip>
  );
}

/**
 * The status a row shows. Listed by status, the section says where a diff
 * stands, so a card only adds what a reviewed diff was, while a name, which
 * has nothing else beside it, always shows its diff's status. Listed by test,
 * nothing else on the row says where the diff stands. Walking a journey, with
 * no status sections left, a screen says on its own whether it changed.
 */
function getRowStatus(input: {
  diff: Diff;
  status: EvaluationStatus | null;
  grouping: SnapshotGrouping;
  display: SnapshotDisplay;
  isSubsetBuild: boolean;
  journeyMode: boolean;
}): DiffGroupName | null {
  const { diff, status, grouping, display, isSubsetBuild, journeyMode } = input;
  if (journeyMode) {
    return getDiffListStatus(diff, null, { isSubsetBuild });
  }
  if (grouping === "test") {
    return getDiffListStatus(diff, status, { isSubsetBuild });
  }
  const reviewed =
    status === EvaluationStatus.Accepted ||
    status === EvaluationStatus.Rejected;
  return reviewed || display === "names"
    ? getDiffListStatus(diff, null, { isSubsetBuild })
    : null;
}

function DiffName(props: { diff: Diff; result: DiffResult | null }) {
  const { diff, result } = props;
  if (!result) {
    return diff.name;
  }
  const start = Math.max(result.match.index, 0);
  const end = result.match.index + result.match.length;
  return (
    <>
      {result.key.slice(0, start)}
      <strong>{result.key.slice(start, end)}</strong>
      {result.key.slice(end)}
    </>
  );
}

const ListItem = memo(function ListItem(props: {
  item: ListItemRow | ListGroupItemRow;
  index: number;
  status: EvaluationStatus | null;
  /**
   * The status shown on the row, or null when the section it is listed in
   * already says it.
   */
  listStatus: DiffGroupName | null;
  display: SnapshotDisplay;
  active: boolean;
  setActiveDiff: (diff: Diff) => void;
  observer: IntersectionObserver | null;
  onToggleGroupItem: (groupId: string | null) => void;
  groupStatus: EvaluationStatus | null;
}) {
  const {
    item,
    index,
    active,
    status,
    listStatus,
    display,
    setActiveDiff,
    observer,
    onToggleGroupItem,
    groupStatus,
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
  const isGroupItem = item.type === "group-item" && item.group.size > 1;
  const isSubItem = item.type === "item" && item.parent;

  const rowStyle = getRowStyle(item, display);

  const subItemToggle = isGroupItem ? (
    <ShowSubItemToggle
      onToggleGroupItem={() => onToggleGroupItem(item.diff.group ?? null)}
      count={item.group.size}
      open={item.expanded}
      active={active}
    />
  ) : null;

  const buttonProps = {
    ref,
    "data-index": index,
    onClick: () => setActiveDiff(item.diff),
    "aria-current": active ? ("true" as const) : undefined,
  };

  if (display === "names") {
    return (
      <div className="w-full px-2" style={rowStyle}>
        <ListItemButton
          {...buttonProps}
          title={
            listStatus
              ? `${item.diff.name} (${getDiffGroupDefinition(listStatus).label})`
              : item.diff.name
          }
          className={clsx(
            "flex size-full items-center gap-1.5 rounded-md pr-1 text-xs",
            isSubItem ? "pl-6" : "pl-2",
            active
              ? "bg-active text-default"
              : "text-low hover:bg-hover hover:text-default",
          )}
        >
          {isSubItem && (
            <CornerDownRightIcon className="text-low size-3 shrink-0" />
          )}
          {/* No tooltips here: rows this short mount by the dozen on every
              scroll, so the row's native title names the snapshot instead. */}
          {listStatus && <DiffStatusIcon group={listStatus} />}
          <div className="min-w-0 flex-1 truncate">
            <DiffName diff={item.diff} result={item.result} />
          </div>
          {subItemToggle}
        </ListItemButton>
      </div>
    );
  }

  const button = (
    <ListItemButton {...buttonProps} className="size-full">
      <StatusDiffCard isActive={active} status={status}>
        <DiffImage diff={item.diff} config={DIFF_IMAGE_CONFIG} />
        <DiffCardFooter
          alwaysVisible={
            searchMode ||
            status !== EvaluationStatus.Pending ||
            listStatus !== null
          }
        >
          {listStatus && <DiffStatusIndicator group={listStatus} />}
          <DiffCardFooterText>
            <DiffName diff={item.diff} result={item.result} />
          </DiffCardFooterText>
          {subItemToggle && (
            <div className="shrink-0 py-2">{subItemToggle}</div>
          )}
        </DiffCardFooter>
      </StatusDiffCard>
    </ListItemButton>
  );

  return (
    <div
      className={clsx("relative w-full px-4", isSubItem && "pl-10")}
      style={{ ...rowStyle }}
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
      {button}
    </div>
  );
});

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
  if (row.diff.baseScreenshot?.url) {
    preloadImage(row.diff.baseScreenshot.url);
  }
  if (row.diff.compareScreenshot?.url) {
    preloadImage(row.diff.compareScreenshot.url);
  }
  if (row.diff.url) {
    preloadImage(row.diff.url);
  }
};

/**
 * Get the height and padding of the row based on the row type.
 */
function getRowStyle(
  row: ListItemRow | ListGroupItemRow,
  display: SnapshotDisplay,
) {
  const { innerHeight, edgeGap, gap } =
    display === "names"
      ? { innerHeight: NAME_ROW_HEIGHT, edgeGap: 4, gap: 0 }
      : {
          innerHeight: Math.max(
            getDiffDimensions(row.diff, DIFF_IMAGE_CONFIG).height,
            DIFF_IMAGE_CONFIG.minHeight,
          ),
          edgeGap: 12,
          gap: 12,
        };
  const paddingTop = row.first ? edgeGap : gap / 2;
  const paddingBottom = row.last ? edgeGap : gap / 2;
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
    scrollRequest,
    stats,
    results,
    hasNoResults,
    isSubsetBuild,
    grouping,
    diffs,
    journeyMode,
  } = useBuildDiffState();
  const { searchMode } = useSearchModeState();
  const [display] = useSnapshotDisplay();
  const filterState = use(FilterStateContext);
  const rows = useMemo(
    () => getRows(groups, expanded, results, searchMode, journeyMode),
    [groups, expanded, results, searchMode, journeyMode],
  );
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

  const getDiffStatus = useGetDiffStatus();
  const getListStatus = useCallback(
    (diff: Diff) =>
      getDiffListStatus(diff, getDiffStatus(diff.id), { isSubsetBuild }),
    [getDiffStatus, isSubsetBuild],
  );

  // The first diff listed under that status, review included, whichever way
  // the list is grouped: by status, that is the first of its section.
  const openGroup = useCallback(
    (name: DiffGroupName) => {
      const firstDiff = diffs.find((diff) => getListStatus(diff) === name);
      if (firstDiff) {
        setActiveDiff(firstDiff, true);
      }
    },
    [diffs, getListStatus, setActiveDiff],
  );

  // Per test rather than in the header, which renders on every scroll.
  const testStatuses = useMemo(() => {
    const statuses = new Map<string, DiffGroupName>();
    for (const group of groups) {
      if (group.type === "test") {
        const groupStatuses = new Set(
          group.diffs.map((diff) => {
            const status = getListStatus(diff);
            invariant(status, "a listed diff has a status");
            return status;
          }),
        );
        statuses.set(group.name, getFirstListedStatus(groupStatuses));
      }
    }
    return statuses;
  }, [groups, getListStatus]);

  const stickyIndices = useMemo(() => {
    return rows.reduce((acc, row, index) => {
      if (row.type === "header") {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);
  }, [rows]);

  const [activeStickyIndex, setActiveStickyIndex] = useState<number>(0);
  const estimateSize = useCallback(
    (index: number) => {
      const row = rows[index];
      if (!row) {
        return 0;
      }
      switch (row.type) {
        case "header": {
          const headerHeight = 33.5;
          return headerHeight - (row.borderBottom ? 0 : 0.5);
        }
        case "item":
        case "group-item": {
          return getRowStyle(row, display).height;
        }
        default:
          return 0;
      }
    },
    [display, rows],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize,
    scrollPaddingStart: 30,
    getScrollElement: () => containerRef.current,
    overscan: 10,
    getItemKey: (index) => {
      const row = rows[index];
      invariant(row, "a row should exist for each index");
      return row.key;
    },
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

  const rowVirtualizerRef = useLiveRef(rowVirtualizer);

  useEffect(() => {
    // Don't scroll to the first diff if the user has already scrolled
    if (firstDiff === initialDiff) {
      return;
    }
    const index = getDiffIndex(initialDiff);
    if (index !== -1) {
      rowVirtualizerRef.current.scrollToIndex(index, {
        align: "start",
        behavior: "smooth",
      });
    }
  }, [initialDiff, firstDiff, getDiffIndex, rowVirtualizerRef]);

  const { observer, getIndicesInViewport } = useInViewportIndices(containerRef);

  useEffect(() => {
    if (!scrollRequest) {
      return;
    }
    const { diff, reflowed } = scrollRequest;
    const index = getDiffIndex(diff);
    if (index === -1 || (!reflowed && getIndicesInViewport().has(index))) {
      return;
    }
    rowVirtualizerRef.current.scrollToIndex(index, {
      align: "start",
      behavior: reflowed ? "auto" : "smooth",
    });
  }, [scrollRequest, getDiffIndex, getIndicesInViewport, rowVirtualizerRef]);

  const handleToggleGroupItem = useCallback(
    (groupId: string | null) => {
      if (groupId) {
        toggleGroup(groupId);
      }
    },
    [toggleGroup],
  );

  const getDiffGroupStatus = useGetDiffGroupEvaluationStatus();
  const hasOverview = (stats?.total ?? 0) > 0;

  return (
    <>
      {stats && !searchMode && (
        // The hairline sits on the wrapper, not on the scroller: the fade would
        // take the separator's ends with it and leave the rule looking broken.
        <div className="border-b-thin shrink-0">
          <div className="no-scrollbar scroll-mask-x-from-90% flex items-center gap-2 overflow-x-auto px-2">
            {hasOverview && <OverviewButton />}
            <BuildStatsIndicator
              stats={stats}
              onClickGroup={openGroup}
              isSubsetBuild={isSubsetBuild}
            />
          </div>
        </div>
      )}
      {/* Bottom edge only: a group header pins itself to the top of this box
          while its screenshots scroll under it, and a top fade would dissolve
          the header that names what you are looking at. */}
      <div
        ref={containerRef}
        data-testid="diff-list-scroller"
        className="scroll-mask-b-from-95% min-h-0 flex-1 overflow-y-auto"
      >
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
                  <Heading>Nothing to show</Heading>
                  <EmptyStateDescription>
                    No screenshot matches your search.
                  </EmptyStateDescription>
                </EmptyState>
              );
            }

            const virtualItems = rowVirtualizer
              .getVirtualItems()
              .filter((x) => x);

            if (virtualItems.length === 0 && !searchMode) {
              // The build having no screenshots and the filters leaving none
              // are the same empty list, and the quickstart guide is nonsense
              // advice for the second.
              if (filterState && filterState.active.size > 0) {
                return (
                  <EmptyState>
                    <EmptyStateIcon>
                      <ImagesIcon />
                    </EmptyStateIcon>
                    {/* A plain heading, so the line under it can state the
                        case without echoing it. "all" is the word that earns
                        its place: categories combine, so every filter can have
                        matches of its own while the intersection has none. */}
                    <Heading>Nothing to show</Heading>
                    <EmptyStateDescription>
                      No screenshot matches all the filters.
                    </EmptyStateDescription>
                    <EmptyStateActions>
                      <Button
                        variant="secondary"
                        onClick={() => filterState.setActive(new Set())}
                      >
                        Clear filters
                      </Button>
                    </EmptyStateActions>
                  </EmptyState>
                );
              }
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
                      key={virtualRow.key}
                      item={item}
                      testStatuses={testStatuses}
                      activeIndex={
                        activeDiff ? item.group.diffs.indexOf(activeDiff) : -1
                      }
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
                  if (display === "screenshots") {
                    preloadListItemRow(item);
                  }
                  // Only a stack of cards draws the status of its group.
                  const groupStatus =
                    display === "screenshots" && item.type === "group-item"
                      ? (getDiffGroupStatus?.(item.diff.group ?? null) ?? null)
                      : null;
                  const status = getDiffStatus(item.diff.id);
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        height: virtualRow.size,
                        width: "100%",
                        top: 0,
                        left: 0,
                        position: "absolute",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <ListItem
                        index={virtualRow.index}
                        item={item}
                        active={activeDiff === item.diff}
                        setActiveDiff={setActiveDiff}
                        observer={observer}
                        onToggleGroupItem={handleToggleGroupItem}
                        groupStatus={groupStatus}
                        status={status}
                        listStatus={getRowStatus({
                          diff: item.diff,
                          status,
                          grouping,
                          display,
                          isSubsetBuild,
                          journeyMode,
                        })}
                        display={display}
                      />
                    </div>
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

/**
 * Link to the build overview: a button next to the sidebar's tabs, filled in
 * while the overview is the page being shown.
 */
function OverviewButton() {
  const params = useBuildParams();
  if (!params) {
    return null;
  }
  const selected = params.diffId == null;
  return (
    <Tooltip content="Overview">
      <LinkButton
        href={getBuildOverviewURL(params)}
        variant="ghost"
        size="small"
        iconOnly
        aria-label="Overview"
        aria-current={selected ? "page" : undefined}
      >
        <HomeIcon />
      </LinkButton>
    </Tooltip>
  );
}
