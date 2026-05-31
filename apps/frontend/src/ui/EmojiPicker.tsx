import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from "@tanstack/react-virtual";
import { clsx } from "clsx";
import emojibaseCompact from "emojibase-data/en/compact.json";
import emojibaseMessages from "emojibase-data/en/messages.json";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { SmilePlusIcon } from "lucide-react";
import { DialogTrigger, type PopoverProps } from "react-aria-components";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { mergeRefs } from "@/util/merge-refs";

import { Dialog } from "./Dialog";
import { IconButton, type IconButtonProps } from "./IconButton";
import { Popover } from "./Popover";

export { DialogTrigger as EmojiPickerTrigger } from "react-aria-components";

/** A single emoji, as exposed by this picker. */
export type Emoji = {
  /** The emoji character, e.g. `"😀"`. */
  emoji: string;
  /** The human readable label, e.g. `"grinning face"`. */
  label: string;
};

type EmojiEntry = Emoji & {
  /** Search keywords (label + emojibase tags). */
  tags: string[];
};

// --- emojibase data ---------------------------------------------------------

type CompactEmoji = {
  hexcode: string;
  label: string;
  unicode: string;
  group?: number;
  order?: number;
  tags?: string[];
};

/** Group id for skin-tone/hair "components" — not real emojis, always skipped. */
const COMPONENT_GROUP = 2;

const compactEmojis = emojibaseCompact as unknown as CompactEmoji[];
const groupMessages = (
  emojibaseMessages as unknown as {
    groups: { key: string; order: number; message: string }[];
  }
).groups;

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const GROUP_LABELS = new Map(
  groupMessages.map((group) => [group.order, capitalize(group.message)]),
);

const EMOJIS_BY_HEXCODE = new Map<string, EmojiEntry>();
const groupBuckets = new Map<number, { order: number; entry: EmojiEntry }[]>();

for (const emoji of compactEmojis) {
  const entry: EmojiEntry = {
    emoji: emoji.unicode,
    label: emoji.label,
    tags: emoji.tags ?? [],
  };
  EMOJIS_BY_HEXCODE.set(emoji.hexcode, entry);
  if (
    typeof emoji.group === "number" &&
    emoji.group !== COMPONENT_GROUP &&
    typeof emoji.order === "number"
  ) {
    let bucket = groupBuckets.get(emoji.group);
    if (!bucket) {
      bucket = [];
      groupBuckets.set(emoji.group, bucket);
    }
    bucket.push({ order: emoji.order, entry });
  }
}

/** Standard emojibase categories, ordered, each sorted by emojibase order. */
const STANDARD_GROUPS = Array.from(groupBuckets.keys())
  .sort((a, b) => a - b)
  .map((groupId) => ({
    id: `group-${groupId}`,
    label: GROUP_LABELS.get(groupId) ?? "",
    emojis: groupBuckets
      .get(groupId)!
      .sort((a, b) => a.order - b.order)
      .map(({ entry }) => entry),
  }));

/** Flat list of every standard emoji, used for search. */
const ALL_EMOJIS = STANDARD_GROUPS.flatMap((group) => group.emojis);

/**
 * A curated set of work-friendly emojis shown as a dedicated category, inspired
 * by Slack's "Getting work done" section.
 */
// prettier-ignore
const WORK_HEXCODES = [
  "2705", "1F44D", "1F44E", "1F64C", "1F44F", "1F64F", "1F44B", "1F91D",
  "1F4AF", "1F525", "2728", "1F389", "1F38A", "1F680", "1F4E3", "1F3AF",
  "1F4A1", "1F440", "1F914", "1FAE1", "1F4AA", "2B50", "2795", "1F604",
  "1F605", "2764",
];

const WORK_EMOJIS = WORK_HEXCODES.map((hexcode) =>
  EMOJIS_BY_HEXCODE.get(hexcode),
).filter((entry): entry is EmojiEntry => entry != null);

function searchEmojis(query: string): EmojiEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [];
  }
  return ALL_EMOJIS.filter((entry) => {
    const haystack = `${entry.label} ${entry.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

// --- recently used ----------------------------------------------------------

/** Maximum number of recently used emojis kept in local storage. */
const MAX_RECENT_EMOJIS = 18;

const recentEmojisAtom = atomWithStorage<Emoji[]>(
  "preferences.recentEmojis",
  [],
);

/**
 * Returns the list of recently used emojis and a function to record a new
 * selection. The list is persisted in local storage, deduplicated by emoji
 * character (most recent first) and capped at {@link MAX_RECENT_EMOJIS}.
 */
function useRecentEmojis(): [Emoji[], (emoji: Emoji) => void] {
  const [recentEmojis, setRecentEmojis] = useAtom(recentEmojisAtom);
  const addRecentEmoji = useCallback(
    (emoji: Emoji) => {
      setRecentEmojis((current) =>
        [
          { emoji: emoji.emoji, label: emoji.label },
          ...current.filter((it) => it.emoji !== emoji.emoji),
        ].slice(0, MAX_RECENT_EMOJIS),
      );
    },
    [setRecentEmojis],
  );
  return [recentEmojis, addRecentEmoji];
}

// --- layout -----------------------------------------------------------------

const COLUMNS = 9;
const CELL_SIZE = 28;
const HEADER_HEIGHT = 28;
const VIEWPORT_HEIGHT = 256;
const GRID_PADDING_X = 8;
const GRID_WIDTH = COLUMNS * CELL_SIZE;

type Section = { id: string; label: string; emojis: EmojiEntry[] };

type Row =
  | { type: "header"; key: string; label: string }
  | { type: "emojis"; key: string; emojis: EmojiEntry[] };

/** Split sections into header rows and rows of at most {@link COLUMNS} emojis. */
function buildRows(sections: Section[]): Row[] {
  const rows: Row[] = [];
  for (const section of sections) {
    if (section.emojis.length === 0) {
      continue;
    }
    rows.push({
      type: "header",
      key: `header-${section.id}`,
      label: section.label,
    });
    for (let index = 0; index < section.emojis.length; index += COLUMNS) {
      rows.push({
        type: "emojis",
        key: `${section.id}-${index}`,
        emojis: section.emojis.slice(index, index + COLUMNS),
      });
    }
  }
  return rows;
}

type ActiveCell = { row: number; col: number };

function firstEmojiCell(rows: Row[]): ActiveCell | null {
  const row = rows.findIndex((it) => it.type === "emojis");
  return row === -1 ? null : { row, col: 0 };
}

// --- component --------------------------------------------------------------

export type EmojiPickerProps = {
  ref?: React.Ref<HTMLDivElement>;
  className?: string;
  /** Called with the selected {@link Emoji} (use `emoji.emoji` for the character). */
  onEmojiSelect?: (emoji: Emoji) => void;
  /** Whether to focus the search input on mount. @default true */
  autoFocus?: boolean;
};

/**
 * A virtualized emoji picker built on {@link https://emojibase.dev | emojibase}
 * data and {@link https://tanstack.com/virtual | TanStack Virtual}.
 *
 * It shows sticky category headers, a "recently used" list (persisted in local
 * storage), a curated "getting work done" category and full keyboard support
 * (arrow keys navigate the grid, Enter selects). Meant to be rendered inside an
 * overlay such as {@link EmojiPickerPopover}.
 */
export function EmojiPicker(props: EmojiPickerProps) {
  const { ref, className, onEmojiSelect, autoFocus = true } = props;
  const baseId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [recentEmojis, addRecentEmoji] = useRecentEmojis();
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => searchEmojis(query), [query]);
  const isSearching = query.trim().length > 0;

  const rows = useMemo(() => {
    if (isSearching) {
      return buildRows([
        { id: "search", label: "Search results", emojis: searchResults },
      ]);
    }
    const sections: Section[] = [];
    if (recentEmojis.length > 0) {
      sections.push({
        id: "recent",
        label: "Recently used",
        emojis: recentEmojis.map((it) => ({ ...it, tags: [] })),
      });
    }
    sections.push({
      id: "work",
      label: "Getting work done",
      emojis: WORK_EMOJIS,
    });
    sections.push(...STANDARD_GROUPS);
    return buildRows(sections);
  }, [isSearching, searchResults, recentEmojis]);

  const emojiRowIndexes = useMemo(
    () =>
      rows.reduce<number[]>((acc, row, index) => {
        if (row.type === "emojis") {
          acc.push(index);
        }
        return acc;
      }, []),
    [rows],
  );

  const headerIndexes = useMemo(
    () =>
      rows.reduce<number[]>((acc, row, index) => {
        if (row.type === "header") {
          acc.push(index);
        }
        return acc;
      }, []),
    [rows],
  );

  // Cumulative pixel offset of each row. Sizes are fixed, so this is exact and
  // lets us scroll a cell into view while accounting for the sticky header.
  const rowOffsets = useMemo(() => {
    const offsets: number[] = [];
    let offset = 0;
    for (const row of rows) {
      offsets.push(offset);
      offset += row.type === "header" ? HEADER_HEIGHT : CELL_SIZE;
    }
    return offsets;
  }, [rows]);

  const [active, setActive] = useState<ActiveCell | null>(null);

  // Reset the active cell and scroll to the top whenever the visible rows
  // change (typing a query, or the recent list changing after a selection).
  useEffect(() => {
    setActive(firstEmojiCell(rows));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [rows]);

  // Scroll an emoji row into view, keeping it clear of the pinned sticky header
  // (which overlaps the top of the viewport).
  const scrollRowIntoView = useCallback(
    (rowIndex: number) => {
      const element = scrollRef.current;
      if (!element) {
        return;
      }
      const top = rowOffsets[rowIndex] ?? 0;
      const bottom = top + CELL_SIZE;
      const viewTop = element.scrollTop + HEADER_HEIGHT;
      const viewBottom = element.scrollTop + element.clientHeight;
      if (top < viewTop) {
        element.scrollTop = Math.max(0, top - HEADER_HEIGHT);
      } else if (bottom > viewBottom) {
        element.scrollTop = bottom - element.clientHeight;
      }
    },
    [rowOffsets],
  );

  const activeStickyIndexRef = useRef(0);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      rows[index]?.type === "header" ? HEADER_HEIGHT : CELL_SIZE,
    overscan: 6,
    rangeExtractor: useCallback(
      (range: Range) => {
        const activeHeader =
          headerIndexes.findLast((index) => range.startIndex >= index) ?? 0;
        activeStickyIndexRef.current = activeHeader;
        const next = new Set([activeHeader, ...defaultRangeExtractor(range)]);
        return [...next].sort((a, b) => a - b);
      },
      [headerIndexes],
    ),
  });

  const handleSelect = useCallback(
    (entry: EmojiEntry) => {
      const emoji = { emoji: entry.emoji, label: entry.label };
      addRecentEmoji(emoji);
      onEmojiSelect?.(emoji);
    },
    [addRecentEmoji, onEmojiSelect],
  );

  const moveActive = useCallback(
    (direction: "left" | "right" | "up" | "down" | "home" | "end") => {
      if (!active || emojiRowIndexes.length === 0) {
        return;
      }
      const rowLength = (rowIndex: number) => {
        const row = rows[rowIndex];
        return row?.type === "emojis" ? row.emojis.length : 0;
      };
      const position = emojiRowIndexes.indexOf(active.row);
      const prevRow = emojiRowIndexes[position - 1];
      const nextRow = emojiRowIndexes[position + 1];
      let next = active;
      switch (direction) {
        case "right":
          if (active.col < rowLength(active.row) - 1) {
            next = { row: active.row, col: active.col + 1 };
          } else if (nextRow != null) {
            next = { row: nextRow, col: 0 };
          }
          break;
        case "left":
          if (active.col > 0) {
            next = { row: active.row, col: active.col - 1 };
          } else if (prevRow != null) {
            next = { row: prevRow, col: rowLength(prevRow) - 1 };
          }
          break;
        case "down":
          if (nextRow != null) {
            next = {
              row: nextRow,
              col: Math.min(active.col, rowLength(nextRow) - 1),
            };
          }
          break;
        case "up":
          if (prevRow != null) {
            next = {
              row: prevRow,
              col: Math.min(active.col, rowLength(prevRow) - 1),
            };
          }
          break;
        case "home": {
          const row = emojiRowIndexes[0]!;
          next = { row, col: 0 };
          break;
        }
        case "end": {
          const row = emojiRowIndexes[emojiRowIndexes.length - 1]!;
          next = { row, col: rowLength(row) - 1 };
          break;
        }
      }
      if (next !== active) {
        setActive(next);
        scrollRowIntoView(next.row);
      }
    },
    [active, emojiRowIndexes, rows, scrollRowIntoView],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveActive("right");
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveActive("left");
        break;
      case "ArrowDown":
        event.preventDefault();
        moveActive("down");
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive("up");
        break;
      case "Home":
        event.preventDefault();
        moveActive("home");
        break;
      case "End":
        event.preventDefault();
        moveActive("end");
        break;
      case "Enter": {
        if (active) {
          const row = rows[active.row];
          const entry = row?.type === "emojis" ? row.emojis[active.col] : null;
          if (entry) {
            event.preventDefault();
            handleSelect(entry);
          }
        }
        break;
      }
    }
  };

  const listboxId = `${baseId}-listbox`;
  const optionId = (cell: ActiveCell) => `${baseId}-${cell.row}-${cell.col}`;
  const activeId = active ? optionId(active) : undefined;

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={ref}
      className={clsx("isolate flex flex-col select-none", className)}
      style={{ width: GRID_WIDTH + GRID_PADDING_X * 2 }}
    >
      <input
        type="text"
        role="combobox"
        autoFocus={autoFocus}
        aria-label="Search emoji"
        aria-autocomplete="list"
        aria-expanded
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        placeholder="Search emoji…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        className={clsx(
          "text-default placeholder:text-placeholder border-b-thin w-full appearance-none bg-transparent px-3 py-2.5 text-sm leading-tight",
          "focus:outline-hidden",
        )}
      />
      <div
        ref={scrollRef}
        id={listboxId}
        role="listbox"
        aria-label="Emoji"
        className="relative overflow-x-hidden overflow-y-auto outline-hidden"
        style={{ height: VIEWPORT_HEIGHT, paddingInline: GRID_PADDING_X }}
      >
        {rows.length === 0 ? (
          <div className="text-low absolute inset-0 -mt-12 flex items-center justify-center text-sm">
            {`No emoji found for “${query.trim()}”`}
          </div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: GRID_WIDTH,
              position: "relative",
            }}
          >
            {virtualItems.map((virtualItem) => {
              const row = rows[virtualItem.index]!;
              const isActiveSticky =
                row.type === "header" &&
                activeStickyIndexRef.current === virtualItem.index;
              const style: React.CSSProperties = isActiveSticky
                ? {
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    height: virtualItem.size,
                  }
                : {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualItem.size,
                    transform: `translateY(${virtualItem.start}px)`,
                  };

              if (row.type === "header") {
                return (
                  <div
                    key={virtualItem.key}
                    style={style}
                    className="bg-subtle text-low flex items-center px-1 pt-1 text-xs font-medium"
                  >
                    {row.label}
                  </div>
                );
              }

              return (
                <div key={virtualItem.key} style={style} className="flex">
                  {row.emojis.map((entry, col) => {
                    const isActive =
                      active?.row === virtualItem.index && active.col === col;
                    return (
                      <div
                        key={`${entry.emoji}-${col}`}
                        id={optionId({ row: virtualItem.index, col })}
                        role="option"
                        aria-selected={isActive}
                        aria-label={entry.label}
                        onMouseEnter={() =>
                          setActive({ row: virtualItem.index, col })
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(entry)}
                        className={clsx(
                          "flex shrink-0 cursor-default items-center justify-center rounded-sm text-lg",
                          "aria-selected:bg-active",
                        )}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      >
                        {entry.emoji}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export type EmojiPickerPopoverProps = Omit<PopoverProps, "children"> & {
  /** Called with the selected {@link Emoji} (use `emoji.emoji` for the character). */
  onEmojiSelect: (emoji: Emoji) => void;
};

/**
 * An {@link EmojiPicker} rendered inside our {@link Popover}.
 *
 * Pair it with an {@link EmojiPickerTrigger} (re-exported `DialogTrigger`) and a
 * trigger element. The popover closes automatically once an emoji is selected.
 *
 * @example
 * ```tsx
 * <EmojiPickerTrigger>
 *   <IconButton><SmilePlusIcon /></IconButton>
 *   <EmojiPickerPopover onEmojiSelect={({ emoji }) => console.log(emoji)} />
 * </EmojiPickerTrigger>
 * ```
 */
export function EmojiPickerPopover(props: EmojiPickerPopoverProps) {
  const { onEmojiSelect, ...popoverProps } = props;
  return (
    <Popover {...popoverProps}>
      <Dialog aria-label="Emoji picker" scrollable={false}>
        {({ close }) => (
          <EmojiPicker
            onEmojiSelect={(emoji) => {
              onEmojiSelect(emoji);
              close();
            }}
          />
        )}
      </Dialog>
    </Popover>
  );
}

export type EmojiPickerFieldProps<TFieldValues extends FieldValues> = {
  ref?: React.Ref<HTMLButtonElement>;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  /** Accessible label for the trigger button. */
  "aria-label"?: string;
  /** Props forwarded to the trigger {@link IconButton}. */
  buttonProps?: Omit<IconButtonProps, "ref">;
};

/**
 * A react-hook-form compatible emoji picker field.
 *
 * It stores the selected emoji character as the field value and renders an
 * {@link IconButton} trigger that opens an {@link EmojiPickerPopover}.
 */
export function EmojiPickerField<TFieldValues extends FieldValues>(
  props: EmojiPickerFieldProps<TFieldValues>,
) {
  const {
    ref,
    control,
    name,
    buttonProps,
    "aria-label": ariaLabel = "Pick an emoji",
  } = props;
  const { field } = useController({ control, name });
  const mergedRef = mergeRefs(field.ref, ref);
  return (
    <DialogTrigger>
      <IconButton
        aria-label={ariaLabel}
        {...buttonProps}
        ref={mergedRef}
        isDisabled={field.disabled || buttonProps?.isDisabled}
        onBlur={(event) => {
          field.onBlur();
          buttonProps?.onBlur?.(event);
        }}
      >
        {field.value ? (
          <span className="text-base leading-none">{field.value}</span>
        ) : (
          <SmilePlusIcon />
        )}
      </IconButton>
      <EmojiPickerPopover
        onEmojiSelect={({ emoji }) => {
          field.onChange(emoji);
        }}
      />
    </DialogTrigger>
  );
}
