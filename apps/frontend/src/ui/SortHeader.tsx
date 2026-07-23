import clsx from "clsx";

export type SortDirection = "asc" | "desc";

/**
 * A sortable table header.
 *
 * It renders the `<th>` itself rather than just the button: `aria-sort` is only
 * meaningful on the `columnheader`, so leaving the cell to the caller would put
 * the attribute out of reach — or, worse, on the button where it is ignored.
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
    <th
      className={clsx("px-4 py-3", props.className)}
      aria-sort={
        isActive
          ? props.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className="whitespace-nowrap"
        onClick={() => props.onSort(props.sortKey)}
      >
        {props.label} {arrow}
      </button>
    </th>
  );
}
