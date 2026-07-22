import clsx from "clsx";

export type SortDirection = "asc" | "desc";

/**
 * A clickable table header that toggles sorting on its column.
 */
export function SortHeader<Key extends string>(props: {
  label: string;
  sortKey: Key;
  activeSortKey: Key;
  direction: SortDirection;
  onSort: (key: Key) => void;
  className?: string;
}) {
  const isActive = props.activeSortKey === props.sortKey;
  const arrow = isActive ? (props.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      className={clsx("whitespace-nowrap", props.className)}
      onClick={() => props.onSort(props.sortKey)}
      aria-sort={
        isActive
          ? props.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      {props.label} {arrow}
    </button>
  );
}
